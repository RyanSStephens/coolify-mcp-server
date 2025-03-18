# Coolify MCP Server

![CoolifyMCP](https://github.com/wrediam/coolify-mcp-server/blob/main/graphics/CoolifyMCP.png)

A Model Context Protocol server that provides integration with the Coolify API. This server enables interaction with Coolify instances through MCP tools.

> **Compatibility:** Tested with Coolify version 4.0.0-beta.397

## Prerequisites

- Node.js 18 or higher
- Coolify Base URL
- Coolify API token

## Features

- Teams management (list, get details, members)
- Server management (create, validate, resources, domains)
- Service lifecycle management (start, stop, restart)
- Application lifecycle management (start, stop, restart, execute commands)
- Deployment tracking
- Private key management
- Version and health checks

## Installation

```bash
# Install globally
npm install -g coolify-mcp-server

# Or use with npx
npx coolify-mcp-server
```

## Configuration

The server requires two environment variables:

- `COOLIFY_BASE_URL`: The base URL of your Coolify instance
- `COOLIFY_TOKEN`: Your Coolify API token

### Getting an API Token

1. Go to your Coolify instance
2. Navigate to `Keys & Tokens` / `API tokens`
3. Create a new token with the following required permissions:
   - read (for fetching information)
   - write (for managing resources)
   - deploy (for deployment operations)

## Usage

### In MCP Settings

Add the following to your MCP settings configuration:

```json
{
  "mcpServers": {
    "coolify": {
      "command": "npx",
      "args": ["-y", "coolify-mcp-server"],
      "env": {
        "COOLIFY_BASE_URL": "your-coolify-url",
        "COOLIFY_TOKEN": "your-api-token"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

Windows Cline users may need the following:

```json
{
  "mcpServers": {
    "coolify": {
      "command": "cmd",
      "args": [
        "/c",
        "npx",
        "-y",
        "coolify-mcp-server"
      ],
      "env": {
        "COOLIFY_BASE_URL": "your-coolify-url",
        "COOLIFY_TOKEN": "your-api-token"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

### Available Tools

#### Version & Health
- `get_version`: Get Coolify version information
- `health_check`: Check Coolify API health status

#### Teams
- `list_teams`: List all teams
- `get_team`: Get details of a specific team
- `get_current_team`: Get current team details
- `get_current_team_members`: Get current team members

#### Servers
- `list_servers`: List all servers
- `create_server`: Create a new server
- `validate_server`: Validate server configuration
- `get_server_resources`: Get server resource usage
- `get_server_domains`: Get server domains

#### Services
- `list_services`: List all services
- `create_service`: Create a new service
- `start_service`: Start a service
- `stop_service`: Stop a service
- `restart_service`: Restart a service

#### Applications
- `list_applications`: List all applications
- `create_application`: Create a new application
- `start_application`: Start an application
- `stop_application`: Stop an application
- `restart_application`: Restart an application
- `execute_command_application`: Execute command in application container

#### Deployments
- `list_deployments`: List all deployments
- `get_deployment`: Get deployment details

#### Private Keys
- `list_private_keys`: List all private keys
- `create_private_key`: Create a new private key

## License

MIT
