"""TCP bridge: reads members' MT5 accounts read-only and sends the Quant Terminal daily percentages.

It runs on a Windows PC with MT5 (see README.md). On every run it:
  1. asks the terminal for the connected accounts, each password sealed to this bridge's key;
  2. opens each password with the private key, in memory only, and logs in to MT5 with it;
  3. refuses anything but a live PU Prime or Vantage account opened with its investor password;
  4. works out each trading day's return from the account's own deal history (daystats.py);
  5. sends back fractions and counts only: never a balance, never the password.
It never places, changes or closes a trade: there is no code here that could.

  python tcp_bridge.py          run every few minutes (every_minutes in config.json) until stopped
  python tcp_bridge.py --once   one run, then stop
  python tcp_bridge.py --check  check the keys, the token and the terminal, without logging in to MT5
"""
import argparse
import base64
import getpass
import hashlib
import json
import logging
import logging.handlers
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

import daystats

HERE = os.path.dirname(os.path.abspath(__file__))
SECRETS = os.path.join(HERE, 'secrets')
PRIVATE_KEY = os.path.join(SECRETS, 'bridge_private.pem')
TOKEN_FILE = os.path.join(SECRETS, 'bridge_token.txt')

REAL = 2  # MetaTrader5.ACCOUNT_TRADE_MODE_REAL
SUCCESS = 1  # MT5's last_error() code when a call worked but had nothing to return
WRONG_DETAILS = {-6, -4, -2}  # MT5's "authorization failed", "not found" and "invalid parameters"
LOGIN_TIMEOUT_MS = 60000
MAX_DAYS = 100  # the most days the terminal takes in one report
BACKOFF_MAX = 8  # runs to wait, at most, after MT5 couldn't reach an account

log = logging.getLogger('tcp-bridge')


class SetupError(Exception):
    """Something only Lewis can fix: the bridge stops and says what."""


class SealError(Exception):
    """A password that this bridge's key can't open."""


class Unreachable(Exception):
    """MT5 or the broker didn't answer: tried again on a later run."""


class WorkerError(Exception):
    def __init__(self, status, code, message=None):
        super().__init__(f'the terminal answered {status} {code}' + (f': {message}' if message else ''))
        self.status = status
        self.code = code


# What to do when the terminal turns the bridge away, in the words of terminal/SETUP.md.
FIXES = {
    'no_db': 'the terminal has no database yet: in Cloudflare, add a D1 database to the terminal Worker '
             'as DB (Settings, Bindings), then deploy. terminal/SETUP.md, step 4',
    'unauthorised': 'the terminal didn\'t accept the bridge\'s token: paste secrets/bridge_token.txt into '
                    'Cloudflare as the secret BRIDGE_TOKEN again, then deploy',
    'not_found': 'check that worker_url in config.json is the terminal\'s address, not the bot\'s',
}


def explain(err):
    fix = FIXES.get(err.code) or (FIXES['not_found'] if err.status == 404 else None)
    return f'{err}. Fix: {fix}' if fix else str(err)


# ------------------------------------------------------------------ the key
class BridgeKey:
    """The bridge's private key, and its id: the first 16 hex digits of the SHA-256 of the public
    key, as the terminal shows it."""

    def __init__(self, private_key):
        self.private_key = private_key
        der = private_key.public_key().public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
        self.id = hashlib.sha256(der).hexdigest()[:16]

    @classmethod
    def load(cls, passphrase, path=PRIVATE_KEY):
        if not os.path.exists(path):
            raise SetupError('No private key yet: run make_keys.py first.')
        with open(path, 'rb') as f:
            data = f.read()
        try:
            return cls(serialization.load_pem_private_key(data, password=passphrase.encode('utf-8')))
        except (ValueError, TypeError) as err:
            raise SetupError('That passphrase doesn\'t open the private key.') from err

    def unseal(self, secret):
        """What the member's phone sealed: {"v": 1, "login", "server", "password"}."""
        try:
            data = self.private_key.decrypt(
                base64.b64decode(secret, validate=True),
                padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None),
            )
            value = json.loads(data.decode('utf-8'))
        except (ValueError, TypeError) as err:
            raise SealError('the key can\'t open it') from err
        if not isinstance(value, dict) or value.get('v') != 1:
            raise SealError('not a sealed MT5 login')
        return value


# --------------------------------------------------------------- the terminal
class Worker:
    """The Quant Terminal's bridge routes, signed in with the bridge's token."""

    def __init__(self, url, token, opener=urllib.request.urlopen, timeout=30):
        self.url = url.rstrip('/')
        self.token = token
        self.opener = opener
        self.timeout = timeout

    def _call(self, method, path, body=None):
        request = urllib.request.Request(
            self.url + path, method=method,
            data=None if body is None else json.dumps(body).encode('utf-8'),
            headers={'Authorization': f'Bearer {self.token}', 'Content-Type': 'application/json', 'User-Agent': 'tcp-bridge/1'},
        )
        try:
            with self.opener(request, timeout=self.timeout) as res:
                return json.loads(res.read().decode('utf-8'))
        except urllib.error.HTTPError as err:
            try:
                data = json.loads(err.read().decode('utf-8'))
            except ValueError:
                data = {}
            raise WorkerError(err.code, data.get('error') or 'http', data.get('message')) from None

    def links(self):
        return self._call('GET', '/bridge/links')

    def report(self, payload):
        return self._call('POST', '/bridge/report', payload)


# ------------------------------------------------------------------ reading
def same_server(a, b):
    squash = lambda s: re.sub(r'[\s-]+', '', str(s or '')).lower()
    return squash(a) == squash(b)


def masked(login):
    return '****' + str(login)[-4:]


def fetch(mt5, call, *args):
    """An MT5 call that returns a list: an empty one when MT5 says there was nothing to return."""
    result = call(*args)
    if result is None:
        if (mt5.last_error() or (0, ''))[0] != SUCCESS:
            raise Unreachable
        return ()
    return result


def read_link(mt5, key, link, config, now):
    """One account: its report for the terminal, or the reason it couldn't be read."""
    fail = lambda error: {'id': link['id'], 'ok': False, 'error': error}
    if link.get('keyId') != key.id:
        return fail('key')  # sealed to a key this bridge no longer has
    try:
        sealed = key.unseal(link['secret'])
    except SealError:
        return fail('key')
    password = sealed.get('password')
    if str(sealed.get('login')) != str(link['login']) or not same_server(sealed.get('server'), link['server']) \
            or not isinstance(password, str) or not password:
        return fail('mismatch')
    ok = mt5.login(int(link['login']), password=password, server=link['server'], timeout=LOGIN_TIMEOUT_MS)
    del password, sealed
    if not ok:
        error = mt5.last_error() or (0, '')
        log.info('%s %s: MT5 says %s', link['id'][:6], masked(link['login']), error)  # its code and words, never a password
        return fail('login' if error[0] in WRONG_DETAILS else 'unreachable')
    info = mt5.account_info()
    if info is None:
        return fail('unreachable')
    if int(info.login) != int(link['login']) or not same_server(info.server, link['server']):
        return fail('mismatch')
    if info.trade_allowed:
        return fail('master')  # an investor login can't trade: this was the master password
    if info.trade_mode != REAL:
        return fail('demo')
    pattern = config['companies'].get(link['broker'])
    if not pattern or not re.search(pattern, info.company or '', re.IGNORECASE):
        return fail('broker')

    since = link['since']
    report_from = since
    if link.get('last'):  # the last week again, in case the broker corrected anything
        report_from = max(since, (datetime.fromisoformat(link['last']) - timedelta(days=7)).date().isoformat())
    start = datetime.fromisoformat(report_from).replace(tzinfo=timezone.utc) - timedelta(days=config.get('history_days', 60))
    try:
        deals = fetch(mt5, mt5.history_deals_get, start, now + timedelta(days=1))
        positions = fetch(mt5, mt5.positions_get)
    except Unreachable:
        return fail('unreachable')
    open_ids = {getattr(p, 'identifier', None) or p.ticket for p in positions}
    rows = daystats.day_rows(deals, open_ids, info.balance, report_from)
    return {'id': link['id'], 'ok': True, 'days': rows[-MAX_DAYS:], 'open': daystats.open_fraction(info)}


def run_once(mt5, worker, key, config, backoff=None, now=None):
    """One pass over every connected account. Returns how each one went."""
    now = now or datetime.now(timezone.utc)
    backoff = backoff if backoff is not None else {}
    data = worker.links()
    if data.get('keyId') != key.id:
        raise SetupError(
            f'The terminal\'s BRIDGE_PUBLIC_KEY has id {data.get("keyId")}, but this bridge\'s key is {key.id}. '
            'Paste secrets/bridge_public.txt into Cloudflare as BRIDGE_PUBLIC_KEY again.')
    outcomes = {}
    links = sorted(data.get('links', []), key=lambda l: l['broker'])  # pending ones stay first within each broker
    for broker in dict.fromkeys(l['broker'] for l in links):
        group = [l for l in links if l['broker'] == broker]
        due = []
        for link in group:
            fails, wait = backoff.get(link['id'], (0, 0))
            if wait > 0:
                backoff[link['id']] = (fails, wait - 1)
                outcomes[link['id']] = 'waiting'
            else:
                due.append(link)
        if not due:
            continue
        path = config['terminals'].get(broker)
        if not path or not mt5.initialize(path, portable=True, timeout=LOGIN_TIMEOUT_MS):
            reason = f'{path}: MT5 says {mt5.last_error()}' if path else 'no terminal set in config.json'
            log.warning('MT5 for %s didn\'t start (%s): trying again next run', broker, reason)
            for link in due:
                outcomes[link['id']] = send(worker, {'id': link['id'], 'ok': False, 'error': 'unreachable'}, link, backoff)
            continue
        try:
            for link in due:
                try:
                    report = read_link(mt5, key, link, config, now)
                except Exception as err:  # one account going wrong mustn't stop the others
                    log.warning('%s %s: couldn\'t read it (%s)', link['id'][:6], masked(link['login']), type(err).__name__)
                    report = {'id': link['id'], 'ok': False, 'error': 'unreachable'}
                outcomes[link['id']] = send(worker, report, link, backoff)
        finally:
            mt5.shutdown()
    return outcomes


def send(worker, report, link, backoff):
    """Report one account, and wait longer before the next try while MT5 can't reach it."""
    outcome = 'ok' if report['ok'] else report['error']
    if outcome == 'unreachable':
        fails = backoff.get(link['id'], (0, 0))[0] + 1
        backoff[link['id']] = (fails, min(2 ** (fails - 1), BACKOFF_MAX) - 1)
    else:
        backoff.pop(link['id'], None)
    try:
        worker.report(report)
    except (WorkerError, urllib.error.URLError, OSError) as err:
        log.warning('%s: the terminal didn\'t take the report (%s)', link['id'][:6], err)
        outcome = 'unsent'
    days = len(report.get('days', []))
    log.info('%s %s %s: %s%s', link['id'][:6], link['broker'], masked(link['login']), outcome, f', {days} days' if report['ok'] else '')
    return outcome


# --------------------------------------------------------------------- setup
def load_config(path):
    if not os.path.exists(path):
        raise SetupError(f'No {os.path.basename(path)}: copy config.example.json to config.json and fill it in.')
    with open(path, encoding='utf-8-sig') as f:  # Notepad may save a byte-order mark
        config = json.load(f)
    if not str(config.get('worker_url', '')).startswith('https://'):
        raise SetupError('worker_url in config.json must be the terminal\'s https:// address.')
    config.setdefault('every_minutes', 30)
    config.setdefault('history_days', 60)
    config.setdefault('terminals', {})
    config.setdefault('companies', {'puprime': r'pu\s*prime', 'vantage': r'vantage'})
    return config


def load_token():
    token = os.environ.get('TCP_BRIDGE_TOKEN', '').strip()
    if not token and os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, encoding='utf-8') as f:
            token = f.read().strip()
    if not token:
        raise SetupError('No bridge token: run make_keys.py, or set TCP_BRIDGE_TOKEN.')
    return token


def setup_logging():
    log.setLevel(logging.INFO)
    fmt = logging.Formatter('%(asctime)s %(message)s', '%Y-%m-%d %H:%M:%S')
    for handler in (logging.StreamHandler(sys.stdout), logging.handlers.RotatingFileHandler(os.path.join(HERE, 'bridge.log'), maxBytes=1_000_000, backupCount=3, encoding='utf-8')):
        handler.setFormatter(fmt)
        log.addHandler(handler)


def main(argv=None):
    parser = argparse.ArgumentParser(description='TCP bridge: members\' MT5 accounts, read-only, to the Quant Terminal as percentages.')
    parser.add_argument('--once', action='store_true', help='one run, then stop')
    parser.add_argument('--check', action='store_true', help='check the setup without logging in to MT5')
    parser.add_argument('--config', default=os.path.join(HERE, 'config.json'))
    args = parser.parse_args(argv)
    setup_logging()
    try:
        config = load_config(args.config)
        worker = Worker(config['worker_url'], load_token())
        passphrase = os.environ.get('TCP_BRIDGE_PASSPHRASE') or getpass.getpass('Passphrase for the bridge\'s private key: ')
        key = BridgeKey.load(passphrase)
        del passphrase
        log.info('Bridge key %s', key.id)
        if args.check:
            try:
                data = worker.links()
            except WorkerError as err:
                raise SetupError(explain(err)) from None
            statuses = {}
            for l in data.get('links', []):
                statuses[l['status']] = statuses.get(l['status'], 0) + 1
            log.info('The terminal\'s key is %s: %s', data.get('keyId'), 'they match' if data.get('keyId') == key.id else 'THEY DON\'T MATCH')
            log.info('Accounts to read: %s', ', '.join(f'{n} {s}' for s, n in statuses.items()) or 'none yet')
            for broker, name in (('puprime', 'PU Prime'), ('vantage', 'Vantage')):
                path = config['terminals'].get(broker)
                if not path:
                    log.info('MT5 for %s: not set up yet, so %s accounts wait until it is', name, name)
                else:
                    log.info('MT5 for %s: %s', name, path if os.path.exists(path) else f'NOT FOUND at {path}')
            try:
                import MetaTrader5
                log.info('MetaTrader5 package: %s', getattr(MetaTrader5, '__version__', 'installed'))
            except ImportError:
                log.info('MetaTrader5 package: not installed for this Python. Run: py -m pip install -r requirements.txt')
            return 0
        import MetaTrader5 as mt5  # Windows only; installed from requirements.txt
        backoff = {}
        while True:
            try:
                outcomes = run_once(mt5, worker, key, config, backoff)
                counts = {}
                for outcome in outcomes.values():
                    counts[outcome] = counts.get(outcome, 0) + 1
                log.info('Run done: %s', ', '.join(f'{n} {o}' for o, n in sorted(counts.items())) or 'no accounts connected')
            except WorkerError as err:
                log.warning('%s. Trying again next run', explain(err))
            except (urllib.error.URLError, OSError) as err:
                log.warning('Couldn\'t reach the terminal (%s): trying again next run', err)
            if args.once:
                return 0
            time.sleep(max(5, float(config['every_minutes'])) * 60)
    except SetupError as err:
        log.error('%s', err)
        return 2
    except KeyboardInterrupt:
        log.info('Stopped.')
        return 0


if __name__ == '__main__':
    sys.exit(main())
