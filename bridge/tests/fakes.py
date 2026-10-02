"""Stand-ins for MT5 and the Quant Terminal, and a member's phone sealing a password."""
import base64
import json
from collections import namedtuple
from datetime import datetime, timezone

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding

Deal = namedtuple('Deal', 'ticket time time_msc type entry position_id profit commission swap fee')
Position = namedtuple('Position', 'ticket identifier')
Info = namedtuple('Info', 'login server company trade_mode trade_allowed balance equity credit')

_tickets = iter(range(1, 1_000_000))


def when(text):
    """Server time 'YYYY-MM-DD HH:MM' as MT5 gives it: seconds."""
    return int(datetime.fromisoformat(text).replace(tzinfo=timezone.utc).timestamp())


def deal(at, kind, entry=0, position=0, profit=0.0, commission=0.0, swap=0.0, fee=0.0):
    t = when(at)
    return Deal(next(_tickets), t, t * 1000, kind, entry, position, profit, commission, swap, fee)


def seal(key, payload):
    """What the member's phone does: the login sealed to the bridge's public key (RSA-OAEP, SHA-256)."""
    data = json.dumps(payload).encode('utf-8')
    oaep = padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None)
    return base64.b64encode(key.private_key.public_key().encrypt(data, oaep)).decode('ascii')


class Trading(AssertionError):
    pass


class FakeMT5:
    """MT5's Python API as the bridge uses it. Accounts are keyed by login:
    {investor, master, server, company, mode, balance, equity, credit, deals, positions, down}."""

    def __init__(self, accounts, start=True):
        self.accounts = accounts
        self.start = start
        self.calls = []
        self.error = (1, 'Success')
        self.current = None
        self.history_none = None  # an error code for history_deals_get to answer None with

    def initialize(self, path, portable=False, timeout=None):
        self.calls.append(('initialize', path, portable))
        if not self.start:
            self.error = (-10003, 'IPC initialize failed')
        return self.start

    def login(self, login, password=None, server=None, timeout=None):
        self.calls.append(('login', login, server))
        account = self.accounts.get(login)
        if account is None or account.get('down'):
            self.error = (-10005, 'IPC timeout')
            return False
        if password not in (account['investor'], account.get('master')):
            self.error = (-6, 'Terminal: Authorization failed')
            return False
        self.current = (login, account, password == account.get('master'))
        self.error = (1, 'Success')
        return True

    def last_error(self):
        return self.error

    def account_info(self):
        login, a, master = self.current
        if a.get('broken'):
            raise RuntimeError('terminal went away')
        return Info(login, a['server'], a['company'], a.get('mode', 2), master, a['balance'], a.get('equity', a['balance']), a.get('credit', 0.0))

    def history_deals_get(self, date_from, date_to):
        self.calls.append(('history', date_from, date_to))
        if self.history_none is not None:
            self.error = (self.history_none, 'no history')
            return None
        return tuple(self.current[1].get('deals', []))

    def positions_get(self):
        return tuple(self.current[1].get('positions', []))

    def shutdown(self):
        self.calls.append(('shutdown',))

    # Anything that trades fails the test.
    def order_send(self, *a, **k):
        raise Trading('the bridge must never trade')

    order_check = order_calc_margin = order_send


class FakeWorker:
    def __init__(self, key_id, links):
        self.key_id = key_id
        self.all = links
        self.reports = []

    def links(self):
        return {'keyId': self.key_id, 'links': self.all}

    def report(self, payload):
        self.reports.append(json.loads(json.dumps(payload)))  # as it would travel
        return {'ok': True}
