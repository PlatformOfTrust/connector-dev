# Connector

HTTP server to handle Platform of Trust Broker API requests.

## Getting Started

These instructions will get you a copy of the connector up and running.

### Prerequisites

Mandatory environment variables are:
```
TRANSLATOR_DOMAIN=www.example.com
```

Connector generates RSA keys automatically, but keys can be also applied from the environment.
```
PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMII...
PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\nMII...
```

Issuing and renewing free Let's Encrypt SSL certificate by Greenlock Express v4 is supported by including the following variable.
```
GREENLOCK_MAINTANER=info@example.com
```

### Installing

A step by step series of examples that tell you how to get the connector configured.

Configuration is accomplished by entering parameters and credentials to make a connection to the preferred system.

```
Give the example
```
