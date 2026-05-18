import re
import smtplib
import socket
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

_executor = ThreadPoolExecutor(max_workers=10)

DISPOSABLE_DOMAINS = {
    "mailinator.com","guerrillamail.com","tempmail.com","throwam.com",
    "sharklasers.com","guerrillamailblock.com","grr.la","guerrillamail.info",
    "trashmail.com","trashmail.me","trashmail.net","dispostable.com",
    "yopmail.com","yopmail.fr","cool.fr.nf","jetable.fr.nf","nospam.ze.tc",
    "nomail.xl.cx","mega.zik.dj","speed.1s.fr","courriel.fr.nf","moncourrier.fr.nf",
    "monemail.fr.nf","monmail.fr.nf","spamgourmet.com","spamgourmet.net",
    "spamgourmet.org","spam4.me","spamfree24.org","spamfree.eu","spamhere.eu",
    "spamspot.com","spamthis.co.uk","spamtroll.net","suremail.info",
    "mailnull.com","pookmail.com","maildrop.cc","fakeinbox.com","mailnesia.com",
    "filzmail.com","spamex.com","discard.email","spamgob.com","spamoff.de",
    "wegwerfmail.de","temporarymail.net","emailondeck.com",
    "tempinbox.com","mailtemp.info","10minutemail.com","10minutemail.net",
    "20minutemail.com","minutemail.com","burnermail.io",
}

FREE_PROVIDERS = {
    "gmail.com","yahoo.com","hotmail.com","outlook.com","live.com",
    "icloud.com","me.com","mac.com","aol.com","msn.com","protonmail.com",
    "proton.me","tutanota.com","zoho.com","yandex.com","mail.ru",
    "gmx.com","gmx.net","fastmail.com","inbox.com","rediffmail.com",
    "libero.it","virgilio.it","wanadoo.fr","orange.fr","free.fr",
    "laposte.net","sfr.fr","t-online.de","web.de","freenet.de",
}

ROLE_ACCOUNTS = {
    "admin","administrator","webmaster","hostmaster","postmaster","abuse",
    "noc","security","support","help","info","contact","sales","marketing",
    "billing","accounts","finance","hr","jobs","careers","press","media",
    "legal","privacy","compliance","feedback","newsletter","no-reply","noreply",
    "donotreply","do-not-reply","unsubscribe","errors","bounce","bounces",
    "spam","notification","notifications","alerts","service","services",
    "enquiries","enquiry","reply","office","team","hello","hi",
}

EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$')


def _get_mx_record(domain: str) -> Optional[str]:
    try:
        import dns.resolver
        records = dns.resolver.resolve(domain, 'MX', lifetime=5)
        mx = sorted(records, key=lambda r: r.preference)[0]
        return str(mx.exchange).rstrip('.')
    except Exception:
        return None


def _smtp_check(email: str, mx_host: str) -> dict:
    result = {"deliverable": None, "smtp_response": "", "error": ""}
    from_addr = "verify@check.com"
    for port in [25, 587, 465]:
        try:
            if port == 465:
                server = smtplib.SMTP_SSL(mx_host, port, timeout=8)
            else:
                server = smtplib.SMTP(timeout=8)
                server.connect(mx_host, port)
            server.set_debuglevel(0)
            server.ehlo_or_helo_if_needed()
            server.mail(from_addr)
            code, msg = server.rcpt(email)
            server.rset()
            server.quit()
            result["smtp_response"] = f"{code} {msg.decode(errors='ignore')}"
            if code == 250:
                result["deliverable"] = True
            elif code in (550, 551, 552, 553, 554):
                result["deliverable"] = False
            else:
                result["deliverable"] = None
            return result
        except smtplib.SMTPRecipientsRefused as e:
            result["deliverable"] = False
            result["smtp_response"] = str(e)
            return result
        except (socket.timeout, socket.gaierror, ConnectionRefusedError, OSError):
            continue
        except Exception as e:
            result["error"] = str(e)
            continue
    result["error"] = "Could not connect to mail server on ports 25/587/465"
    return result


def verify_email_sync(email: str) -> dict:
    email = email.strip().lower()
    result = {
        "email": email,
        "valid_format": False,
        "disposable": False,
        "free_provider": False,
        "role_account": False,
        "has_mx_record": False,
        "mx_host": "",
        "deliverable": None,
        "smtp_response": "",
        "smtp_error": "",
        "score": 0,
        "verdict": "unknown",
        "verdict_reason": "",
    }

    if not EMAIL_REGEX.match(email):
        result["verdict"] = "invalid"
        result["verdict_reason"] = "Invalid email format"
        return result
    result["valid_format"] = True

    local, domain = email.split("@", 1)
    if domain in DISPOSABLE_DOMAINS:
        result["disposable"] = True
    if domain in FREE_PROVIDERS:
        result["free_provider"] = True
    if local.split("+")[0] in ROLE_ACCOUNTS:
        result["role_account"] = True

    mx_host = _get_mx_record(domain)
    if mx_host:
        result["has_mx_record"] = True
        result["mx_host"] = mx_host
    else:
        result["verdict"] = "invalid"
        result["verdict_reason"] = "Domain has no MX record — cannot receive email"
        return result

    smtp = _smtp_check(email, mx_host)
    result["deliverable"]   = smtp["deliverable"]
    result["smtp_response"] = smtp["smtp_response"]
    result["smtp_error"]    = smtp["error"]

    score = 0
    if result["valid_format"]:          score += 20
    if result["has_mx_record"]:         score += 30
    if result["deliverable"] is True:   score += 40
    if result["deliverable"] is None:   score += 20
    if result["disposable"]:            score -= 30
    if result["role_account"]:          score -= 10
    result["score"] = max(0, min(100, score))

    if result["deliverable"] is False or result["disposable"]:
        result["verdict"] = "invalid"
        parts = []
        if result["deliverable"] is False: parts.append("mailbox does not exist")
        if result["disposable"]:           parts.append("disposable email domain")
        result["verdict_reason"] = ", ".join(parts).capitalize()
    elif result["deliverable"] is True and not result["disposable"]:
        if result["role_account"]:
            result["verdict"] = "risky"
            result["verdict_reason"] = "Valid mailbox but role account (may not reach a real person)"
        else:
            result["verdict"] = "valid"
            result["verdict_reason"] = "Mailbox exists and accepts email"
    else:
        if result["disposable"]:
            result["verdict"] = "invalid"
            result["verdict_reason"] = "Disposable email provider"
        elif result["role_account"]:
            result["verdict"] = "risky"
            result["verdict_reason"] = "Role account — likely not a personal inbox"
        else:
            result["verdict"] = "risky"
            result["verdict_reason"] = "Domain has MX record but mailbox could not be confirmed (server blocks probing)"
    return result
