# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 2.0.x   | :white_check_mark: |
| 1.2.x   | :white_check_mark: |
| < 1.2   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in Edict, please report it responsibly.

**Do NOT open a public GitHub Issue for security vulnerabilities.**

Instead, please send an email to the maintainer or use GitHub's private vulnerability reporting feature:

1. Go to the [Security Advisories](https://github.com/Fsw136/edict/security/advisories) page.
2. Click **"Report a vulnerability"**.
3. Provide a detailed description of the vulnerability, including steps to reproduce.

We will acknowledge receipt within 48 hours and aim to provide a fix within 7 days for critical issues.

## Security Considerations

Edict is designed as a local-first application with the following security characteristics:

**Network Exposure**: The dashboard server (`server.py`) binds to `127.0.0.1` by default. If you expose it to a network, ensure proper authentication and firewall rules are in place.

**API Keys**: API keys for LLM providers are stored locally in OpenClaw's configuration. The `install.sh` script syncs keys across agents but never transmits them over the network.

**Remote Skills**: When importing skills from remote URLs, Edict validates the source and content. However, always review skill content before importing from untrusted sources.

**File System Access**: Agents operate within their designated workspace directories. The symlink structure ensures data consistency while maintaining isolation.

## Best Practices

When deploying Edict, we recommend keeping the dashboard server behind a reverse proxy with authentication if network access is required. Regularly updating to the latest version ensures you have the most recent security patches. Reviewing remote skills before importing them from third-party sources is strongly advised, and restricting file system permissions for the `data/` directory to the application user provides an additional layer of protection.
