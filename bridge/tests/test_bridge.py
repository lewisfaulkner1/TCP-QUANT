"""The bridge end to end with stand-ins for MT5 and the terminal: what it refuses, what it sends,
what it never does (trade, log a password or a token), and how it talks to the terminal."""
import json
import os
import re
import threading
import unittest
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer

from cryptography.hazmat.primitives.asymmetric import rsa

import tcp_bridge
from daystats import BUY, SELL, BALANCE
from tcp_bridge import BridgeKey, SetupError, Worker, WorkerError, run_once
from tests.fakes import FakeMT5, FakeWorker, deal, seal

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEY = BridgeKey(rsa.generate_private_key(public_exponent=65537, key_size=2048))
OTHER = BridgeKey(rsa.generate_private_key(public_exponent=65537, key_size=2048))
NOW = datetime(2026, 9, 30, 12, tzinfo=timezone.utc)
CONFIG = {
    'terminals': {'puprime': 'C:/TCP/MT5-PUPrime/terminal64.exe', 'vantage': 'C:/TCP/MT5-Vantage/terminal64.exe'},
    'companies': {'puprime': r'pu\s*prime', 'vantage': r'vantage'},
    'history_days': 60,
}
INVESTOR = 'inv-Pass#1'
MASTER = 'master-Pass#9'


def account(**over):
    base = {
        'investor': INVESTOR, 'master': MASTER, 'server': 'PUPrime-Live 3', 'company': 'PU Prime Ltd', 'balance': 1021.0, 'equity': 990.0,
        'deals': [
            deal('2026-09-25 09:00', BALANCE, profit=1000),
            deal('2026-09-28 08:00', BUY, 0, 1),
            deal('2026-09-28 09:00', SELL, 1, 1, profit=23),
            deal('2026-09-29 12:00', BUY, 0, 2, commission=-2),
        ],
        'positions': [(2, 2)],
    }
    base.update(over)
    return base


def link(login=12345678, *, id='a1b2c3d4', broker='puprime', server='PUPrime-Live 3', password=INVESTOR, key=KEY, since='2026-09-28', last=None, **over):
    sealed = seal(key, {'v': 1, 'login': str(login), 'server': server, 'password': password})
    return {'id': id, 'broker': broker, 'server': server, 'login': str(login), 'secret': sealed, 'keyId': key.id, 'since': since, 'status': 'active', 'last': last, **over}


def positions(acct):
    from tests.fakes import Position
    return [Position(*p) for p in acct['positions']]


class Run(unittest.TestCase):
    def go(self, accounts, links, worker_key=KEY.id, backoff=None, mt5=None):
        for a in accounts.values():
            a['positions'] = positions(a) if a.get('positions') and isinstance(a['positions'][0], tuple) else a.get('positions', [])
        mt5 = mt5 or FakeMT5(accounts)
        worker = FakeWorker(worker_key, links)
        with self.assertLogs('tcp-bridge', level='INFO') as logs:
            tcp_bridge.log.info('run')
            outcomes = run_once(mt5, worker, KEY, CONFIG, backoff, NOW)
        text = '\n'.join(logs.output)
        for secret in (INVESTOR, MASTER):
            self.assertNotIn(secret, text, 'a password in the log')
        self.assertNotRegex(text, r'\d{8}', 'a whole account number in the log')
        return outcomes, worker.reports, mt5

    def test_a_live_investor_login_sends_its_days_and_open_trades(self):
        outcomes, reports, mt5 = self.go({12345678: account()}, [link()])
        self.assertEqual(outcomes, {'a1b2c3d4': 'ok'})
        [report] = reports
        self.assertEqual(report['id'], 'a1b2c3d4')
        self.assertTrue(report['ok'])
        self.assertEqual([d['day'] for d in report['days']], ['2026-09-28', '2026-09-29'])
        self.assertAlmostEqual(report['days'][0]['ret'], 0.023)
        self.assertAlmostEqual(report['open'], (990 - 1021) / 1021, places=6)
        self.assertEqual(set(report), {'id', 'ok', 'days', 'open'}, 'no balance, no login, no password')
        self.assertNotIn('1021', json.dumps(report))
        self.assertEqual([c[0] for c in mt5.calls], ['initialize', 'login', 'history', 'shutdown'])
        self.assertEqual(mt5.calls[0][1:], ('C:/TCP/MT5-PUPrime/terminal64.exe', True))

    def test_the_history_asked_for_covers_the_last_week_again_and_two_months_before(self):
        _, reports, mt5 = self.go({12345678: account()}, [link(last='2026-09-29')])
        history = [c for c in mt5.calls if c[0] == 'history'][0]
        self.assertEqual(history[1].date().isoformat(), '2026-07-30')  # 28 September (the start) less 60 days
        self.assertEqual(history[2], datetime(2026, 10, 1, 12, tzinfo=timezone.utc))
        self.assertEqual(reports[0]['days'][0]['day'], '2026-09-28')

    def test_a_master_password_is_refused_before_anything_is_read(self):
        outcomes, reports, mt5 = self.go({12345678: account()}, [link(password=MASTER)])
        self.assertEqual(outcomes, {'a1b2c3d4': 'master'})
        self.assertEqual(reports, [{'id': 'a1b2c3d4', 'ok': False, 'error': 'master'}])
        self.assertNotIn('history', [c[0] for c in mt5.calls])

    def test_demo_accounts_and_other_brokers_are_refused(self):
        outcomes, _, _ = self.go(
            {1111: account(mode=0), 2222: account(company='Some Other Markets Ltd')},
            [link(1111, id='demo00'), link(2222, id='other0')],
        )
        self.assertEqual(outcomes, {'demo00': 'demo', 'other0': 'broker'})

    def test_wrong_details_and_a_mismatched_account(self):
        outcomes, _, mt5 = self.go(
            {12345678: account(), 3333: account(server='PUPrime-Live 7')},
            [link(id='wrong0', password='nope'), link(3333, id='serv00')],
        )
        self.assertEqual(outcomes, {'wrong0': 'login', 'serv00': 'mismatch'})

    def test_a_password_this_bridge_cant_open_isnt_tried(self):
        swapped = link(id='swap00')
        swapped['secret'] = link(87654321)['secret']  # sealed for another account
        outcomes, reports, mt5 = self.go(
            {12345678: account()},
            [link(id='oldkey', key=OTHER), {**link(id='junk00'), 'secret': 'not-a-seal'}, swapped],
        )
        self.assertEqual(outcomes, {'oldkey': 'key', 'junk00': 'key', 'swap00': 'mismatch'})
        self.assertNotIn('login', [c[0] for c in mt5.calls], 'no login is tried with a password that doesn\'t fit')

    def test_a_terminal_with_another_key_stops_the_run(self):
        mt5 = FakeMT5({})
        with self.assertRaises(SetupError) as caught:
            run_once(mt5, FakeWorker(OTHER.id, [link()]), KEY, CONFIG, None, NOW)
        self.assertIn(KEY.id, str(caught.exception))
        self.assertEqual(mt5.calls, [])

    def test_when_mt5_cant_be_reached_the_bridge_waits_longer_each_time(self):
        accounts = {12345678: account(down=True)}
        backoff = {}
        seen = []
        for _ in range(6):
            outcomes, _, _ = self.go(accounts, [link()], backoff=backoff)
            seen.append(outcomes['a1b2c3d4'])
        self.assertEqual(seen, ['unreachable', 'unreachable', 'waiting', 'unreachable', 'waiting', 'waiting'])
        accounts[12345678]['down'] = False
        for _ in range(4):
            outcomes, _, _ = self.go(accounts, [link()], backoff=backoff)
        self.assertEqual(outcomes['a1b2c3d4'], 'ok')
        self.assertEqual(backoff, {}, 'reading it again clears the wait')

    def test_one_broker_down_doesnt_stop_the_other(self):
        class HalfDown(FakeMT5):
            def initialize(self, path, portable=False, timeout=None):
                self.calls.append(('initialize', path, portable))
                return 'Vantage' in path
        accounts = {12345678: account(), 5555: account(server='VantageInternational-Live 2', company='Vantage International Group Limited')}
        mt5 = HalfDown(accounts)
        outcomes, _, _ = self.go(accounts, [link(), link(5555, id='vant00', broker='vantage', server='VantageInternational-Live 2')], mt5=mt5)
        self.assertEqual(outcomes, {'a1b2c3d4': 'unreachable', 'vant00': 'ok'})

    def test_an_empty_answer_from_mt5_is_empty_and_an_error_is_unreachable(self):
        mt5 = FakeMT5({12345678: account()})
        mt5.history_none = 1
        outcomes, reports, _ = self.go(mt5.accounts, [link()], mt5=mt5)
        self.assertEqual((outcomes['a1b2c3d4'], reports[0]['days']), ('ok', []))
        mt5 = FakeMT5({12345678: account()})
        mt5.history_none = -10005
        outcomes, _, _ = self.go(mt5.accounts, [link()], mt5=mt5)
        self.assertEqual(outcomes['a1b2c3d4'], 'unreachable')

    def test_one_account_going_wrong_doesnt_stop_the_rest(self):
        outcomes, _, mt5 = self.go({1111: account(broken=True), 12345678: account()}, [link(1111, id='bad000'), link()])
        self.assertEqual(outcomes, {'bad000': 'unreachable', 'a1b2c3d4': 'ok'})
        self.assertEqual(mt5.calls[-1], ('shutdown',))

    def test_there_is_no_code_that_trades(self):
        for name in ('tcp_bridge.py', 'daystats.py', 'make_keys.py'):
            with open(os.path.join(HERE, name), encoding='utf-8') as f:
                source = f.read()
            for call in ('order_send', 'order_check', 'order_calc', 'positions_close', 'TRADE_ACTION'):
                self.assertNotIn(call, source, f'{name} mentions {call}')


class Talking(unittest.TestCase):
    """The HTTP side, against a real local server."""

    def setUp(self):
        self.seen = []
        seen = self.seen

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *a):
                pass

            def answer(self, status, body):
                data = json.dumps(body).encode()
                self.send_response(status)
                self.send_header('content-type', 'application/json')
                self.send_header('content-length', str(len(data)))
                self.end_headers()
                self.wfile.write(data)

            def do_GET(self):
                seen.append(('GET', self.path, self.headers.get('authorization'), None))
                if self.headers.get('authorization') == 'Bearer outage':
                    page = b'<html><body>502 Bad gateway</body></html>'
                    self.send_response(502)
                    self.send_header('content-type', 'text/html')
                    self.send_header('content-length', str(len(page)))
                    self.end_headers()
                    self.wfile.write(page)
                    return
                if self.headers.get('authorization') != 'Bearer t0ken':
                    return self.answer(401, {'error': 'unauthorised'})
                self.answer(200, {'keyId': 'abc', 'links': []})

            def do_POST(self):
                body = json.loads(self.rfile.read(int(self.headers['content-length'])))
                seen.append(('POST', self.path, self.headers.get('authorization'), body))
                if body.get('id') == 'gone':
                    return self.answer(404, {'error': 'not_found', 'message': 'No such link'})
                self.answer(200, {'ok': True, 'saved': len(body.get('days', []))})

        self.server = HTTPServer(('127.0.0.1', 0), Handler)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.url = f'http://127.0.0.1:{self.server.server_port}/'

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()

    def test_links_and_reports_carry_the_token_in_the_header_only(self):
        worker = Worker(self.url, 't0ken')
        self.assertEqual(worker.links(), {'keyId': 'abc', 'links': []})
        self.assertEqual(worker.report({'id': 'x', 'ok': True, 'days': [{'day': '2026-09-28'}]}), {'ok': True, 'saved': 1})
        self.assertEqual([(m, p, a) for m, p, a, _ in self.seen], [('GET', '/bridge/links', 'Bearer t0ken'), ('POST', '/bridge/report', 'Bearer t0ken')])
        self.assertNotIn('t0ken', json.dumps(self.seen[1][3]))

    def test_the_terminals_refusals_come_back_as_errors(self):
        with self.assertRaises(WorkerError) as caught:
            Worker(self.url, 'wrong').links()
        self.assertEqual((caught.exception.status, caught.exception.code), (401, 'unauthorised'))
        with self.assertRaises(WorkerError) as caught:
            Worker(self.url, 't0ken').report({'id': 'gone', 'ok': True})
        self.assertEqual(caught.exception.status, 404)
        self.assertIn('No such link', str(caught.exception))
        with self.assertRaises(WorkerError) as caught:
            Worker(self.url, 'outage').links()  # Cloudflare's own error page, not JSON
        self.assertEqual((caught.exception.status, caught.exception.code), (502, 'http'))


class Setup(unittest.TestCase):
    def test_config_needs_an_https_terminal(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, 'config.json')
            with self.assertRaises(SetupError):
                tcp_bridge.load_config(path)
            with open(path, 'w') as f:
                json.dump({'worker_url': 'http://example.com'}, f)
            with self.assertRaises(SetupError):
                tcp_bridge.load_config(path)
            with open(os.path.join(HERE, 'config.example.json')) as f:
                example = json.load(f)
            with open(path, 'w') as f:
                json.dump(example, f)
            config = tcp_bridge.load_config(path)
            self.assertTrue(re.search(config['companies']['puprime'], 'PU Prime Ltd', re.I))
            self.assertTrue(re.search(config['companies']['vantage'], 'Vantage International Group Limited', re.I))


if __name__ == '__main__':
    unittest.main()
