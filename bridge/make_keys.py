"""Makes the TCP bridge's key pair and its token.

  python make_keys.py             the first time
  python make_keys.py --replace   a new key pair (every connected member will need to reconnect)
  python make_keys.py --new-token a new token (paste it into Cloudflare again)

It writes, in secrets/ (never share this folder, never commit it):
  bridge_private.pem   the private key, locked with a passphrase you choose: only the bridge uses it
  bridge_public.txt    the public key: paste it into Cloudflare as the variable BRIDGE_PUBLIC_KEY
  bridge_token.txt     the bridge's password: paste it into Cloudflare as the secret BRIDGE_TOKEN
Nothing is printed but the key's id, a fingerprint (not the key itself), which the terminal and the
bridge's --check show too, so you can see they match.
"""
import argparse
import getpass
import os
import secrets
import sys

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from tcp_bridge import SECRETS, PRIVATE_KEY, TOKEN_FILE, BridgeKey

PUBLIC_KEY = os.path.join(SECRETS, 'bridge_public.txt')
KEY_BITS = 3072
MIN_PASSPHRASE = 12


def generate(passphrase):
    """A new key pair: the private key as passphrase-locked PEM, the public key as base64 SPKI (the
    form the terminal takes), and the key's id."""
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=KEY_BITS)
    pem = private_key.private_bytes(
        serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
        serialization.BestAvailableEncryption(passphrase.encode('utf-8')),
    )
    der = private_key.public_key().public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
    import base64
    return pem, base64.b64encode(der).decode('ascii'), BridgeKey(private_key).id


def write_private(path, data, binary=False):
    """Writes a file only this user can read (as far as the system allows)."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'wb' if binary else 'w', **({} if binary else {'encoding': 'utf-8'})) as f:
        f.write(data)


def ask_passphrase():
    while True:
        first = getpass.getpass(f'Choose a passphrase for the private key ({MIN_PASSPHRASE}+ characters): ')
        if len(first) < MIN_PASSPHRASE:
            print(f'That\'s shorter than {MIN_PASSPHRASE} characters. Try again.')
            continue
        if getpass.getpass('Type it again: ') != first:
            print('Those didn\'t match. Try again.')
            continue
        return first


def main(argv=None):
    parser = argparse.ArgumentParser(description='Makes the TCP bridge\'s key pair and token.')
    parser.add_argument('--replace', action='store_true', help='make a new key pair (members must reconnect)')
    parser.add_argument('--new-token', action='store_true', help='make a new token')
    args = parser.parse_args(argv)

    made = []
    if os.path.exists(PRIVATE_KEY) and not args.replace:
        print('A key pair already exists. Use --replace for a new one (every member will need to reconnect).')
    else:
        pem, public, key_id = generate(ask_passphrase())
        write_private(PRIVATE_KEY, pem, binary=True)
        write_private(PUBLIC_KEY, public + '\n')
        made.append(f'Key pair made. Its id is {key_id}.')
        made.append(f'  Paste the contents of {PUBLIC_KEY} into Cloudflare as the variable BRIDGE_PUBLIC_KEY.')
    if not os.path.exists(TOKEN_FILE) or args.new_token:
        write_private(TOKEN_FILE, secrets.token_urlsafe(32) + '\n')
        made.append(f'Token made. Paste the contents of {TOKEN_FILE} into Cloudflare as the secret BRIDGE_TOKEN.')
    for line in made:
        print(line)
    if made:
        print('Keep the secrets folder private: never share it, email it or put it in the repository.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
