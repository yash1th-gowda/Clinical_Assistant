# Security Policy

## Scope

Smart Care Assistant is an educational project. It is not designed, certified, or validated for handling real patient data or supporting clinical decisions.

## Reporting a vulnerability

Please do not publish exploit details, credentials, session cookies, personal information, or patient data in a public issue. Contact the repository maintainer privately through the contact method on the maintainer's GitHub profile and include:

- A concise description of the issue
- Affected file or endpoint
- Reproduction steps using synthetic data
- Potential impact
- A suggested mitigation, if known

Allow time for investigation and a fix before publicly disclosing a vulnerability.

## Secret handling

- Never commit `.env` files, browser cookies, access tokens, API keys, private keys, database dumps, or patient records.
- If a secret or session cookie is committed, treat it as compromised. Revoke the session or credential with its issuing service and rotate any associated secrets.
- Deleting a sensitive file in a later commit does not remove it from Git history. History cleanup requires a coordinated rewrite and credential rotation.

## Deployment

Do not expose MongoDB directly to the public internet. Use HTTPS, managed secret storage, least-privilege credentials, backups, and access controls appropriate to the environment. Do not deploy this prototype with real patient information.
