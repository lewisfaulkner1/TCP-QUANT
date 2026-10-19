"""The bridge's keys: made and locked with a passphrase, nothing secret printed, and able to open
what the terminal page seals (its own rkSeal function, run in Node's WebCrypto)."""
import base64
import contextlib
import hashlib
import io
import json
import os
import shutil
import subprocess
import tempfile
import unittest
from unittest import mock

from cryptography.hazmat.primitives import serialization

import make_keys
import tcp_bridge
from tcp_bridge import BridgeKey, SetupError

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = os.path.join(HERE, '..', 'terminal', 'src', 'rank-page.js')
PASSPHRASE = 'correct horse battery'


class Keys(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pem, cls.public, cls.key_id = make_keys.generate(PASSPHRASE)

    def test_the_key_pair_is_3072_bits_locked_and_its_id_is_the_public_keys_hash(self):
        self.assertIn(b'ENCRYPTED PRIVATE KEY', self.pem)
        der = base64.b64decode(self.public)
        self.assertEqual(serialization.load_der_public_key(der).key_size, 3072)
        self.assertEqual(self.key_id, hashlib.sha256(der).hexdigest()[:16])
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, 'key.pem')
            with open(path, 'wb') as f:
                f.write(self.pem)
            self.assertEqual(BridgeKey.load(PASSPHRASE, path).id, self.key_id)
            with self.assertRaises(SetupError):
                BridgeKey.load('wrong passphrase', path)
            with self.assertRaises(SetupError):
                BridgeKey.load(PASSPHRASE, os.path.join(tmp, 'missing.pem'))

    def test_make_keys_writes_the_files_prints_nothing_secret_and_wont_overwrite(self):
        with tempfile.TemporaryDirectory() as tmp:
            paths = {
                'PRIVATE_KEY': os.path.join(tmp, 'secrets', 'bridge_private.pem'),
                'PUBLIC_KEY': os.path.join(tmp, 'secrets', 'bridge_public.txt'),
                'TOKEN_FILE': os.path.join(tmp, 'secrets', 'bridge_token.txt'),
            }
            out = io.StringIO()
            with mock.patch.multiple(make_keys, **paths), mock.patch('getpass.getpass', return_value=PASSPHRASE), contextlib.redirect_stdout(out):
                self.assertEqual(make_keys.main([]), 0)
            printed = out.getvalue()
            with open(paths['TOKEN_FILE']) as f:
                token = f.read().strip()
            with open(paths['PUBLIC_KEY']) as f:
                public = f.read().strip()
            self.assertGreaterEqual(len(token), 40)
            for secret in (token, public, PASSPHRASE, 'PRIVATE KEY'):
                self.assertNotIn(secret, printed)
            key = BridgeKey.load(PASSPHRASE, paths['PRIVATE_KEY'])
            self.assertIn(key.id, printed, 'the key id is printed, to check against the terminal')
            # A second run keeps both; --new-token replaces only the token.
            out = io.StringIO()
            with mock.patch.multiple(make_keys, **paths), mock.patch('getpass.getpass', return_value=PASSPHRASE), contextlib.redirect_stdout(out):
                make_keys.main([])
                make_keys.main(['--new-token'])
            with open(paths['TOKEN_FILE']) as f:
                self.assertNotEqual(f.read().strip(), token)
            self.assertEqual(BridgeKey.load(PASSPHRASE, paths['PRIVATE_KEY']).id, key.id)
            self.assertIn('already exists', out.getvalue())

    def test_a_short_passphrase_is_refused(self):
        answers = iter(['short', 'long enough passphrase', 'not the same one', 'long enough passphrase', 'long enough passphrase'])
        out = io.StringIO()
        with mock.patch('getpass.getpass', side_effect=lambda prompt: next(answers)), contextlib.redirect_stdout(out):
            self.assertEqual(make_keys.ask_passphrase(), 'long enough passphrase')
        self.assertIn('shorter than', out.getvalue())
        self.assertIn('didn\'t match', out.getvalue())


@unittest.skipUnless(shutil.which('node') and os.path.exists(PAGE), 'needs Node and the terminal\'s page source')
class WithThePage(unittest.TestCase):
    """The page's own sealing code, run in Node's WebCrypto, and this bridge opening it."""

    def test_what_the_page_seals_the_bridge_opens(self):
        with open(PAGE, encoding='utf-8') as f:
            source = f.read()
        start = source.index('async function rkSeal(')
        seal = source[start:source.index('\n}\n', start) + 2]
        pem, public, _ = make_keys.generate(PASSPHRASE)
        key = BridgeKey(serialization.load_pem_private_key(pem, password=PASSPHRASE.encode()))
        payload = {'v': 1, 'login': '12345678', 'server': 'PUPrime-Live 3', 'password': 'pässwörd with "quotes" & spaces'}
        script = seal + '\nrkSeal(process.argv[1], JSON.parse(process.argv[2])).then((s) => console.log(s));'
        sealed = subprocess.run(['node', '-e', script, public, json.dumps(payload)], capture_output=True, text=True, timeout=60, check=True).stdout.strip()
        self.assertEqual(len(base64.b64decode(sealed)), 384)
        self.assertEqual(key.unseal(sealed), payload)
        # Another key can't open it.
        other = BridgeKey(serialization.load_pem_private_key(make_keys.generate(PASSPHRASE)[0], password=PASSPHRASE.encode()))
        with self.assertRaises(tcp_bridge.SealError):
            other.unseal(sealed)


if __name__ == '__main__':
    unittest.main()
