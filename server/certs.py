"""Self-signed CA + server certificate for the LAN. Safari on iPhone only allows
camera access on HTTPS, so the phone installs our CA once and trusts it."""
import datetime as dt
import ipaddress
import pathlib
import socket

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import ExtendedKeyUsageOID, NameOID


def lan_ips() -> list[str]:
    ips: set[str] = set()
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if not ip.startswith("127.") and not ip.startswith("169.254."):
                ips.add(ip)
    except OSError:
        pass
    primary = None
    try:
        # the address Windows would use to reach the LAN/internet: that is the Wi-Fi one,
        # not a VMware/Hyper-V virtual adapter
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("10.255.255.255", 1))
        primary = s.getsockname()[0]
        s.close()
    except OSError:
        pass
    ordered = sorted(ips - {primary})
    return ([primary] if primary else []) + ordered


def _key():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


def _pem_key(key) -> bytes:
    return key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.TraditionalOpenSSL,
        serialization.NoEncryption(),
    )


def _load_cert(path: pathlib.Path):
    return x509.load_pem_x509_certificate(path.read_bytes())


def _load_key(path: pathlib.Path):
    return serialization.load_pem_private_key(path.read_bytes(), password=None)


def _ensure_ca(cert_dir: pathlib.Path):
    ca_crt, ca_key = cert_dir / "ca.crt", cert_dir / "ca.key"
    if ca_crt.exists() and ca_key.exists():
        return _load_cert(ca_crt), _load_key(ca_key)
    key = _key()
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "lenso Local CA")])
    now = dt.datetime.now(dt.timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - dt.timedelta(days=1))
        .not_valid_after(now + dt.timedelta(days=3650))
        .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True)
        .add_extension(
            x509.KeyUsage(
                digital_signature=True, key_cert_sign=True, crl_sign=True,
                content_commitment=False, key_encipherment=False, data_encipherment=False,
                key_agreement=False, encipher_only=False, decipher_only=False,
            ),
            critical=True,
        )
        .add_extension(x509.SubjectKeyIdentifier.from_public_key(key.public_key()), critical=False)
        .sign(key, hashes.SHA256())
    )
    ca_crt.write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    ca_key.write_bytes(_pem_key(key))
    return cert, key


def _san_covers(cert, ips: list[str]) -> bool:
    try:
        san = cert.extensions.get_extension_for_class(x509.SubjectAlternativeName).value
    except x509.ExtensionNotFound:
        return False
    have = {str(ip) for ip in san.get_values_for_type(x509.IPAddress)}
    return all(ip in have for ip in ips)


def ensure_certs(cert_dir: pathlib.Path, ips: list[str]) -> tuple[pathlib.Path, pathlib.Path, pathlib.Path]:
    """Returns (server.crt, server.key, ca.crt). Re-issues the server cert when the
    PC's LAN IP is not covered yet (new Wi-Fi network, DHCP change)."""
    cert_dir.mkdir(parents=True, exist_ok=True)
    ca_cert, ca_key = _ensure_ca(cert_dir)
    srv_crt, srv_key = cert_dir / "server.crt", cert_dir / "server.key"

    if srv_crt.exists() and srv_key.exists():
        existing = _load_cert(srv_crt)
        still_valid = existing.not_valid_after_utc > dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=7)
        if still_valid and _san_covers(existing, ips):
            return srv_crt, srv_key, cert_dir / "ca.crt"

    key = _key()
    now = dt.datetime.now(dt.timezone.utc)
    san = [x509.DNSName("localhost"), x509.DNSName("lenso.local")]
    san += [x509.IPAddress(ipaddress.ip_address(ip)) for ip in ips]
    san.append(x509.IPAddress(ipaddress.ip_address("127.0.0.1")))
    cert = (
        x509.CertificateBuilder()
        .subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "lenso")]))
        .issuer_name(ca_cert.subject)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - dt.timedelta(days=1))
        # Apple rejects leaf certs valid for more than 825 days.
        .not_valid_after(now + dt.timedelta(days=800))
        .add_extension(x509.SubjectAlternativeName(san), critical=False)
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .add_extension(x509.ExtendedKeyUsage([ExtendedKeyUsageOID.SERVER_AUTH]), critical=False)
        .add_extension(
            x509.KeyUsage(
                digital_signature=True, key_encipherment=True,
                content_commitment=False, data_encipherment=False, key_agreement=False,
                key_cert_sign=False, crl_sign=False, encipher_only=False, decipher_only=False,
            ),
            critical=True,
        )
        .add_extension(x509.AuthorityKeyIdentifier.from_issuer_public_key(ca_key.public_key()), critical=False)
        .sign(ca_key, hashes.SHA256())
    )
    srv_crt.write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    srv_key.write_bytes(_pem_key(key))
    return srv_crt, srv_key, cert_dir / "ca.crt"
