#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosInstance } from 'axios';

interface CoolifyConfig {
  baseUrl: string;
  token: string;
}

class CoolifyServer {
  private server: Server;
  private axiosInstance: AxiosInstance | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'coolify-mcp-server',
        version: '0.1.10',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private initializeAxios(config: CoolifyConfig) {
    this.axiosInstance = axios.create({
      baseURL: `${config.baseUrl}/api/v1`,
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // Version & Health
        {
          name: 'get_version',
          description: 'Get Coolify version information. Returns the current version of the Coolify instance.',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
            examples: [{}]
          }
        },
        {
          name: 'health_check',
          description: 'Check Coolify API health status. Verifies if the API is responsive and functioning correctly.',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
            examples: [{}]
          }
        },
        // Teams
        {
          name: 'list_teams',
          description: 'List all teams the authenticated user has access to. Use this to get team UUIDs needed for other operations.',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
            examples: [{}],
            additionalInfo: {
              responseFormat: 'Returns an array of team objects, each containing: id (UUID), name, and other team details',
              usage: 'Call this first to get team IDs needed for get_team or other team-related operations'
            }
          }
        },
        {
          name: 'get_team',
          description: 'Get details of a specific team. Requires a team UUID obtained from list_teams.',
          inputSchema: {
            type: 'object',
            properties: {
              team_id: {
                type: 'string',
                description: 'UUID of the team to retrieve. This must be a valid UUID obtained from the list_teams response.',
                pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
                examples: ['123e4567-e89b-12d3-a456-426614174000']
              }
            },
            required: ['team_id'],
            examples: [
              {
                team_id: '123e4567-e89b-12d3-a456-426614174000'
              }
            ],
            additionalInfo: {
              workflow: [
                '1. First call list_teams to get available team UUIDs',
                '2. Use a team UUID from the response in this operation'
              ]
            }
          }
        },
        {
          name: 'get_current_team',
          description: 'Get details of the currently authenticated team. This is the team associated with your API token.',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
            examples: [{}],
            additionalInfo: {
              responseFormat: 'Returns a team object containing id (UUID), name, and other team details',
              usage: 'Use this to quickly get information about your current team context',
              notes: [
                'No parameters needed - uses the team context from your API token',
                'Useful for verifying your current team access',
                'Returns the same format as get_team but for the current context'
              ]
            }
          }
        },
        {
          name: 'get_current_team_members',
          description: 'Get a list of all members in the currently authenticated team. Shows who has access to team resources.',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
            examples: [{}],
            additionalInfo: {
              responseFormat: 'Returns an array of team member objects containing user information and roles',
              usage: 'Use this to manage team access and verify member permissions',
              notes: [
                'No parameters needed - uses the team context from your API token',
                'Member information includes usernames, roles, and status',
                'Useful for auditing team access and permissions'
              ]
            }
          }
        },
        // Servers
        {
          name: 'list_servers',
          description: 'List all servers registered in your Coolify instance. Use this to get server UUIDs needed for other operations.',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
            examples: [{}],
            additionalInfo: {
              responseFormat: 'Returns an array of server objects containing UUIDs, names, IP addresses, and configuration details',
              usage: 'Call this first to get server UUIDs needed for other server operations',
              notes: [
                'Lists all servers accessible to your team',
                'Server details include name, IP, status, and configuration',
                'UUIDs from this response are used in many other operations',
                'Use this to find servers for deploying applications or services'
              ],
              relatedTools: [
                'create_server - Add new servers to your instance',
                'validate_server - Check server configuration',
                'get_server_resources - Monitor server status',
                'get_server_domains - Manage server domains'
              ]
            }
          }
        },
        {
          name: 'create_server',
          description: 'Create a new server in Coolify. Requires SSH access details and a private key for authentication.',
          inputSchema: {
            type: 'object',
            properties: {
              name: { 
                type: 'string',
                description: 'A unique, human-readable name for the server',
                examples: ['production-server-1']
              },
              description: { 
                type: 'string',
                description: 'Optional description of the server\'s purpose or configuration',
                examples: ['Main production server for customer-facing applications']
              },
              ip: { 
                type: 'string',
                description: 'IP address of the server. Can be IPv4 or IPv6.',
                pattern: '^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$',
                examples: ['192.168.1.100']
              },
              port: { 
                type: 'number',
                description: 'SSH port number',
                minimum: 1,
                maximum: 65535,
                default: 22,
                examples: [22]
              },
              user: { 
                type: 'string',
                description: 'SSH username for authentication',
                examples: ['root']
              },
              private_key_uuid: { 
                type: 'string',
                description: 'UUID of the private key to use for SSH authentication. Obtain this from list_private_keys.',
                pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
              },
              is_build_server: { 
                type: 'boolean',
                description: 'Whether this server should be used for building applications',
                default: false
              },
              instant_validate: { 
                type: 'boolean',
                description: 'Whether to validate the server configuration immediately after creation',
                default: true
              },
              proxy_type: { 
                type: 'string',
                description: 'Type of proxy to use for this server',
                enum: ['none', 'nginx', 'caddy'],
                default: 'nginx'
              }
            },
            required: ['name', 'ip', 'port', 'user', 'private_key_uuid'],
            examples: [
              {
                name: 'production-server-1',
                description: 'Main production server',
                ip: '192.168.1.100',
                port: 22,
                user: 'root',
                private_key_uuid: '123e4567-e89b-12d3-a456-426614174000',
                is_build_server: false,
                instant_validate: true,
                proxy_type: 'nginx'
              }
            ],
            additionalInfo: {
              workflow: [
                '1. First call list_private_keys to get available private key UUIDs',
                '2. Use a private key UUID from the response when creating the server',
                '3. After creation, you may want to call validate_server to ensure proper configuration'
              ],
              relatedTools: [
                'list_private_keys - Get available private keys',
                'validate_server - Validate server configuration',
                'get_server_resources - Monitor server resources',
                'get_server_domains - Manage server domains'
              ]
            }
          }
        },
        {
          name: 'validate_server',
          description: 'Validate a server\'s configuration and connectivity. Use this to verify server setup and troubleshoot connection issues.',
          inputSchema: {
            type: 'object',
            properties: {
              uuid: {
                type: 'string',
                description: 'UUID of the server to validate. Get this from list_servers.',
                pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
              }
            },
            required: ['uuid'],
            examples: [
              {
                uuid: '123e4567-e89b-12d3-a456-426614174000'
              }
            ],
            additionalInfo: {
              workflow: [
                '1. Get server UUID from list_servers',
                '2. Run validation',
                '3. Check results for any configuration issues'
              ],
              notes: [
                'Validates SSH connectivity and server requirements',
                'Checks for required software and configurations',
                'Reports any issues that need to be addressed',
                'Recommended after server creation or configuration changes'
              ]
            }
          }
        },
        {
          name: 'get_server_resources',
          description: 'Get detailed resource usage information for a server, including CPU, memory, disk, and network statistics.',
          inputSchema: {
            type: 'object',
            properties: {
              uuid: {
                type: 'string',
                description: 'UUID of the server to check. Get this from list_servers.',
                pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
              }
            },
            required: ['uuid'],
            examples: [
              {
                uuid: '123e4567-e89b-12d3-a456-426614174000'
              }
            ],
            additionalInfo: {
              responseFormat: 'Returns an object with detailed resource metrics',
              usage: 'Monitor server health and resource utilization',
              notes: [
                'Provides real-time resource usage statistics',
                'Useful for capacity planning and monitoring',
                'Helps identify performance issues or resource constraints',
                'Regular monitoring recommended for production servers'
              ]
            }
          }
        },
        {
          name: 'get_server_domains',
          description: 'Get a list of domains configured for a server. These domains are used for routing traffic to applications and services.',
          inputSchema: {
            type: 'object',
            properties: {
              uuid: {
                type: 'string',
                description: 'UUID of the server to get domains for. Get this from list_servers.',
                pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
              }
            },
            required: ['uuid'],
            examples: [
              {
                uuid: '123e4567-e89b-12d3-a456-426614174000'
              }
            ],
            additionalInfo: {
              responseFormat: 'Returns an array of domain configurations',
              usage: 'Manage and monitor domain routing for applications',
              notes: [
                'Shows all domains configured for the server',
                'Includes routing and SSL certificate information',
                'Used for managing application access',
                'Important for setting up public access to applications'
              ]
            }
          }
        },
        // Services
        {
          name: 'list_services',
          description: 'List all services across your Coolify instance. Services are containerized applications running on your servers.',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
            examples: [{}],
            additionalInfo: {
              responseFormat: 'Returns an array of service objects containing UUIDs, names, status, and configuration details',
              usage: 'Use this to get service UUIDs needed for management operations',
              notes: [
                'Lists all services accessible to your team',
                'Service details include name, status, and configuration',
                'UUIDs from this response are used in start/stop/restart operations',
                'Monitor service status and health through this endpoint'
              ],
              relatedTools: [
                'create_service - Create new services',
                'start_service - Start a service',
                'stop_service - Stop a service',
                'restart_service - Restart a service'
              ]
            }
          }
        },
        {
          name: 'create_service',
          description: 'Create a new service on a specified server. Services are containerized applications that run on your Coolify servers.',
          inputSchema: {
            type: 'object',
            properties: {
              name: { 
                type: 'string',
                description: 'A unique, human-readable name for the service',
                examples: ['backend-api']
              },
              description: { 
                type: 'string',
                description: 'Optional description of the service\'s purpose or configuration',
                examples: ['Node.js backend API service']
              },
              server_uuid: { 
                type: 'string',
                description: 'UUID of the server where this service will run. Obtain this from list_servers.',
                pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
              },
              project_uuid: { 
                type: 'string',
                description: 'UUID of the project this service belongs to. Projects help organize related services.',
                pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
              },
              environment_name: { 
                type: 'string',
                description: 'Name of the environment (e.g., production, staging, development)',
                examples: ['production']
              },
              environment_uuid: { 
                type: 'string',
                description: 'Optional UUID of an existing environment to use',
                pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
              }
            },
            required: ['name', 'server_uuid', 'project_uuid'],
            examples: [
              {
                name: 'backend-api',
                description: 'Node.js backend API service',
                server_uuid: '123e4567-e89b-12d3-a456-426614174000',
                project_uuid: '987fcdeb-51a2-43f7-9876-543210abcdef',
                environment_name: 'production'
              }
            ],
            additionalInfo: {
              workflow: [
                '1. First call list_servers to get available server UUIDs',
                '2. Use a server UUID from the response when creating the service',
                '3. After creation, you can start the service using start_service'
              ],
              relatedTools: [
                'list_servers - Get available servers',
                'start_service - Start the service',
                'stop_service - Stop the service',
                'restart_service - Restart the service'
              ],
              notes: [
                'Services are tied to specific servers and projects',
                'Environment configuration helps organize services across different deployment stages',
                'After creating a service, you\'ll need its UUID for management operations'
              ]
            }
          }
        },
        {
          name: 'start_service',
          description: 'Start a previously created service. This will initialize the service container and make it accessible.',
          inputSchema: {
            type: 'object',
            properties: {
              uuid: {
                type: 'string',
                description: 'UUID of the service to start. Obtain this from list_services or from the create_service response.',
                pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
              }
            },
            required: ['uuid'],
            examples: [
              {
                uuid: '123e4567-e89b-12d3-a456-426614174000'
              }
            ],
            additionalInfo: {
              workflow: [
                '1. Get the service UUID from list_services',
                '2. Start the service',
                '3. Monitor the service status'
              ],
              relatedTools: [
                'list_services - Get UUIDs of available services',
                'stop_service - Stop the service if needed',
                'restart_service - Restart if issues occur'
              ],
              notes: [
                'Service must be properly configured before starting',
                'Starting may take a few moments depending on the service',
                'Check service logs if startup issues occur'
              ]
            }
          }
        },
        {
          name: 'stop_service',
          description: 'Stop a running service. This will gracefully shut down the service container.',
          inputSchema: {
            type: 'object',
            properties: {
              uuid: {
                type: 'string',
                description: 'UUID of the service to stop. Get this from list_services.',
                pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
              }
            },
            required: ['uuid'],
            examples: [
              {
                uuid: '123e4567-e89b-12d3-a456-426614174000'
              }
            ],
            additionalInfo: {
              workflow: [
                '1. Get the service UUID from list_services',
                '2. Stop the service',
                '3. Verify the service has stopped'
              ],
              relatedTools: [
                'list_services - Get UUIDs of available services',
                'start_service - Restart the service when needed'
              ],
              notes: [
                'Stopping a service will interrupt its operations',
                'Service data persists unless explicitly removed',
                'Use restart_service if you plan to start again immediately'
              ]
            }
          }
        },
        {
          name: 'restart_service',
          description: 'Restart a service by stopping and starting it again. Useful for applying configuration changes or recovering from issues.',
          inputSchema: {
            type: 'object',
            properties: {
              uuid: {
                type: 'string',
                description: 'UUID of the service to restart. Get this from list_services.',
                pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
              }
            },
            required: ['uuid'],
            examples: [
              {
                uuid: '123e4567-e89b-12d3-a456-426614174000'
              }
            ],
            additionalInfo: {
              workflow: [
                '1. Get the service UUID from list_services',
                '2. Restart the service',
                '3. Monitor the service status'
              ],
              relatedTools: [
                'list_services - Get UUIDs of available services',
                'start_service - Start the service if restart fails',
                'stop_service - Stop the service if restart hangs'
              ],
              notes: [
                'Restart performs a graceful stop and start',
                'Service will be briefly unavailable during restart',
                'Useful for applying configuration changes',
                'Monitor service after restart to ensure proper operation'
              ]
            }
          }
        },
        // Applications
        {
          name: 'list_applications',
          description: 'List all applications across your Coolify instance. Applications are deployable units sourced from Git repositories.',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
            examples: [{}],
            additionalInfo: {
              responseFormat: 'Returns an array of application objects containing UUIDs, names, Git repository details, and deployment status',
              usage: 'Use this to get application UUIDs needed for management operations',
              notes: [
                'Lists all applications accessible to your team',
                'Application details include repository, environment, and status',
                'UUIDs from this response are used in many other operations',
                'Monitor application status and deployment state'
              ],
              relatedTools: [
                'create_application - Create new applications',
                'start_application - Start an application',
                'stop_application - Stop an application',
                'restart_application - Restart an application',
                'execute_command_application - Run commands in applications'
              ]
            }
          }
        },
        {
          name: 'create_application',
          description: 'Create a new application in Coolify. Applications are deployable units that can be sourced from Git repositories.',
          inputSchema: {
            type: 'object',
            properties: {
              project_uuid: { 
                type: 'string',
                description: 'UUID of the project this application belongs to. Projects help organize related applications.',
                pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
              },
              environment_name: { 
                type: 'string',
                description: 'Name of the deployment environment (e.g., production, staging, development)',
                examples: ['production', 'staging', 'development']
              },
              environment_uuid: { 
                type: 'string',
                description: 'Optional UUID of an existing environment to use',
                pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
              },
              git_repository: { 
                type: 'string',
                description: 'URL of the Git repository containing the application code',
                examples: ['https://github.com/username/repo.git']
              },
              ports_exposes: { 
                type: 'string',
                description: 'Comma-separated list of ports to expose (e.g., "3000,8080"). These ports will be accessible from outside the container.',
                examples: ['3000', '8080,3000']
              },
              destination_uuid: { 
                type: 'string',
                description: 'UUID of the destination server where this application will be deployed. Get this from list_servers.',
                pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
              }
            },
            required: ['project_uuid', 'environment_name', 'destination_uuid'],
            examples: [
              {
                project_uuid: '123e4567-e89b-12d3-a456-426614174000',
                environment_name: 'production',
                git_repository: 'https://github.com/username/repo.git',
                ports_exposes: '3000',
                destination_uuid: '987fcdeb-51a2-43f7-9876-543210abcdef'
              }
            ],
            additionalInfo: {
              workflow: [
                '1. First call list_servers to get available server UUIDs for the destination_uuid',
                '2. Create the application with required parameters',
                '3. After creation, you can start the application using start_application',
                '4. Monitor the application status and logs as needed'
              ],
              relatedTools: [
                'list_servers - Get available servers for deployment',
                'start_application - Start the application',
                'stop_application - Stop the application',
                'restart_application - Restart the application',
                'execute_command_application - Run commands in the application container'
              ],
              notes: [
                'Applications are tied to specific projects and environments',
                'The Git repository should be accessible by the Coolify server',
                'Exposed ports must be available on the destination server',
                'After creating an application, you\'ll need its UUID for management operations'
              ]
            }
          }
        },
        {
          name: 'start_application',
          description: 'Start a previously created application. This will initialize the application container and make it accessible.',
          inputSchema: {
            type: 'object',
            properties: {
              uuid: {
                type: 'string',
                description: 'UUID of the application to start. Obtain this from list_applications or from the create_application response.',
                pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
              }
            },
            required: ['uuid'],
            examples: [
              {
                uuid: '123e4567-e89b-12d3-a456-426614174000'
              }
            ],
            additionalInfo: {
              workflow: [
                '1. Get the application UUID from list_applications',
                '2. Start the application',
                '3. Monitor the application status'
              ],
              relatedTools: [
                'list_applications - Get UUIDs of available applications',
                'stop_application - Stop the application if needed',
                'restart_application - Restart if issues occur',
                'execute_command_application - Run commands for troubleshooting'
              ]
            }
          }
        },
        {
          name: 'stop_application',
          description: 'Stop a running application. This will gracefully shut down the application container.',
          inputSchema: {
            type: 'object',
            properties: {
              uuid: {
                type: 'string',
                description: 'UUID of the application to stop. Get this from list_applications.',
                pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
              }
            },
            required: ['uuid'],
            examples: [
              {
                uuid: '123e4567-e89b-12d3-a456-426614174000'
              }
            ],
            additionalInfo: {
              workflow: [
                '1. Get the application UUID from list_applications',
                '2. Stop the application',
                '3. Verify the application has stopped'
              ],
              relatedTools: [
                'list_applications - Get UUIDs of available applications',
                'start_application - Restart the application when needed'
              ],
              notes: [
                'Stopping an application will make it inaccessible',
                'Application data persists unless explicitly removed',
                'Use restart_application if you plan to start again immediately'
              ]
            }
          }
        },
        {
          name: 'restart_application',
          description: 'Restart an application by stopping and starting it again. Useful for applying configuration changes or recovering from issues.',
          inputSchema: {
            type: 'object',
            properties: {
              uuid: {
                type: 'string',
                description: 'UUID of the application to restart. Get this from list_applications.',
                pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
              }
            },
            required: ['uuid'],
            examples: [
              {
                uuid: '123e4567-e89b-12d3-a456-426614174000'
              }
            ],
            additionalInfo: {
              workflow: [
                '1. Get the application UUID from list_applications',
                '2. Restart the application',
                '3. Monitor the application status'
              ],
              relatedTools: [
                'list_applications - Get UUIDs of available applications',
                'start_application - Start the application if restart fails',
                'stop_application - Stop the application if restart hangs',
                'execute_command_application - Run commands to verify operation'
              ],
              notes: [
                'Restart performs a graceful stop and start',
                'Application will be briefly unavailable during restart',
                'Useful for applying configuration changes',
                'Monitor application after restart to ensure proper operation'
              ]
            }
          }
        },
        {
          name: 'execute_command_application',
          description: 'Execute a command inside a running application container. Useful for debugging, maintenance, or running one-off tasks.',
          inputSchema: {
            type: 'object',
            properties: {
              uuid: {
                type: 'string',
                description: 'UUID of the application where the command will be executed. Get this from list_applications.',
                pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
              },
              command: {
                type: 'string',
                description: 'The command to execute inside the container. This can be any valid shell command.',
                examples: [
                  'npm run migrations',
                  'python manage.py collectstatic',
                  'ls -la',
                  'cat /var/log/app.log'
                ]
              }
            },
            required: ['uuid', 'command'],
            examples: [
              {
                uuid: '123e4567-e89b-12d3-a456-426614174000',
                command: 'npm run migrations'
              }
            ],
            additionalInfo: {
              workflow: [
                '1. Ensure the application is running (use start_application if needed)',
                '2. Get the application UUID from list_applications',
                '3. Execute the desired command',
                '4. Check the command output in the response'
              ],
              relatedTools: [
                'list_applications - Get UUIDs of available applications',
                'start_application - Ensure application is running',
                'restart_application - Restart if needed'
              ],
              notes: [
                'The application must be running for commands to execute',
                'Commands run in the application\'s container environment',
                'Command execution is synchronous and will return the output',
                'Use with caution as commands can modify the application state'
              ]
            }
          }
        },
        // Deployments
        {
          name: 'list_deployments',
          description: 'List all deployments across your Coolify instance. Deployments represent the history of application and service deployments.',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
            examples: [{}],
            additionalInfo: {
              responseFormat: 'Returns an array of deployment objects containing deployment history, status, and related resource information',
              usage: 'Use this to monitor deployment history and status across your applications and services',
              notes: [
                'Deployments are automatically created when applications or services are updated',
                'Each deployment entry contains timestamps, status, and related resource information',
                'Use get_deployment with a specific UUID to get detailed information about a deployment'
              ]
            }
          }
        },
        {
          name: 'get_deployment',
          description: 'Get detailed information about a specific deployment. Use this to monitor deployment status and troubleshoot issues.',
          inputSchema: {
            type: 'object',
            properties: {
              uuid: {
                type: 'string',
                description: 'UUID of the deployment to retrieve. Obtain this from list_deployments or from deployment event responses.',
                pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
              }
            },
            required: ['uuid'],
            examples: [
              {
                uuid: '123e4567-e89b-12d3-a456-426614174000'
              }
            ],
            additionalInfo: {
              workflow: [
                '1. Get deployment UUID from list_deployments or deployment events',
                '2. Retrieve deployment details',
                '3. Check status and logs if needed'
              ],
              relatedTools: [
                'list_deployments - Get list of all deployments',
                'execute_command_application - Run commands to investigate deployment issues'
              ],
              notes: [
                'Deployment details include status, timestamps, and resource information',
                'Use this to track deployment progress and troubleshoot issues',
                'Failed deployments will include error information'
              ]
            }
          }
        },
        // Private Keys
        {
          name: 'list_private_keys',
          description: 'List all SSH private keys stored in Coolify. These keys are used for server authentication and Git repository access.',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
            examples: [{}],
            additionalInfo: {
              responseFormat: 'Returns an array of private key objects containing UUIDs, names, and metadata',
              usage: 'Use this to get private key UUIDs needed for server creation and Git repository access',
              notes: [
                'Private keys are used for SSH authentication with servers',
                'Keys can also be used for accessing private Git repositories',
                'The actual private key content is never returned, only metadata'
              ]
            }
          }
        },
        {
          name: 'create_private_key',
          description: 'Create a new SSH private key in Coolify for server authentication or Git repository access.',
          inputSchema: {
            type: 'object',
            properties: {
              name: { 
                type: 'string',
                description: 'A unique, human-readable name for the private key',
                examples: ['production-server-key', 'github-deploy-key']
              },
              description: { 
                type: 'string',
                description: 'Optional description of the key\'s purpose or usage',
                examples: ['SSH key for production server access', 'Deploy key for GitHub repositories']
              },
              private_key: { 
                type: 'string',
                description: 'The SSH private key content in PEM format. Must be a valid SSH private key.',
                examples: ['-----BEGIN RSA PRIVATE KEY-----\n...key content...\n-----END RSA PRIVATE KEY-----']
              }
            },
            required: ['name', 'private_key'],
            examples: [
              {
                name: 'production-server-key',
                description: 'SSH key for production server access',
                private_key: '-----BEGIN RSA PRIVATE KEY-----\n...key content...\n-----END RSA PRIVATE KEY-----'
              }
            ],
            additionalInfo: {
              workflow: [
                '1. Generate an SSH key pair on your local machine',
                '2. Store the private key in Coolify using this tool',
                '3. Use the public key on your servers or Git repositories',
                '4. Use the private key UUID when creating servers or applications'
              ],
              relatedTools: [
                'create_server - Create servers using this private key',
                'create_application - Create applications that need Git repository access'
              ],
              notes: [
                'Private keys should be properly formatted and include headers',
                'Never share private keys or commit them to version control',
                'The private key will be encrypted before storage',
                'You can use the same key for multiple servers if desired'
              ]
            }
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (!this.axiosInstance) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          'Coolify configuration not initialized. Please set COOLIFY_BASE_URL and COOLIFY_TOKEN environment variables.'
        );
      }

      try {
        switch (request.params.name) {
          // Version & Health
          case 'get_version':
            const versionResponse = await this.axiosInstance.get('/version');
            return {
              content: [{ type: 'text', text: JSON.stringify(versionResponse.data, null, 2) }]
            };

          case 'health_check':
            const healthResponse = await this.axiosInstance.get('/health');
            return {
              content: [{ type: 'text', text: JSON.stringify(healthResponse.data, null, 2) }]
            };

          // Teams
          case 'list_teams':
            const teamsResponse = await this.axiosInstance.get('/teams');
            return {
              content: [{ type: 'text', text: JSON.stringify(teamsResponse.data, null, 2) }]
            };

          case 'get_team':
            const teamId = request.params.arguments?.team_id;
            if (!teamId) {
              throw new McpError(ErrorCode.InvalidParams, 'team_id is required');
            }
            const teamResponse = await this.axiosInstance.get(`/teams/${teamId}`);
            return {
              content: [{ type: 'text', text: JSON.stringify(teamResponse.data, null, 2) }]
            };

          case 'get_current_team':
            const currentTeamResponse = await this.axiosInstance.get('/teams/current');
            return {
              content: [{ type: 'text', text: JSON.stringify(currentTeamResponse.data, null, 2) }]
            };

          case 'get_current_team_members':
            const currentTeamMembersResponse = await this.axiosInstance.get('/teams/current/members');
            return {
              content: [{ type: 'text', text: JSON.stringify(currentTeamMembersResponse.data, null, 2) }]
            };

          // Servers
          case 'list_servers':
            const serversResponse = await this.axiosInstance.get('/servers');
            return {
              content: [{ type: 'text', text: JSON.stringify(serversResponse.data, null, 2) }]
            };

          case 'create_server':
            const createServerResponse = await this.axiosInstance.post('/servers', request.params.arguments);
            return {
              content: [{ type: 'text', text: JSON.stringify(createServerResponse.data, null, 2) }]
            };

          case 'validate_server':
            const validateServerResponse = await this.axiosInstance.get(`/servers/${request.params.arguments?.uuid}/validate`);
            return {
              content: [{ type: 'text', text: JSON.stringify(validateServerResponse.data, null, 2) }]
            };

          case 'get_server_resources':
            const serverResourcesResponse = await this.axiosInstance.get(`/servers/${request.params.arguments?.uuid}/resources`);
            return {
              content: [{ type: 'text', text: JSON.stringify(serverResourcesResponse.data, null, 2) }]
            };

          case 'get_server_domains':
            const serverDomainsResponse = await this.axiosInstance.get(`/servers/${request.params.arguments?.uuid}/domains`);
            return {
              content: [{ type: 'text', text: JSON.stringify(serverDomainsResponse.data, null, 2) }]
            };

          // Services
          case 'list_services':
            const servicesResponse = await this.axiosInstance.get('/services');
            return {
              content: [{ type: 'text', text: JSON.stringify(servicesResponse.data, null, 2) }]
            };

          case 'create_service':
            const createServiceResponse = await this.axiosInstance.post('/services', request.params.arguments);
            return {
              content: [{ type: 'text', text: JSON.stringify(createServiceResponse.data, null, 2) }]
            };

          case 'start_service':
            const startServiceResponse = await this.axiosInstance.get(`/services/${request.params.arguments?.uuid}/start`);
            return {
              content: [{ type: 'text', text: JSON.stringify(startServiceResponse.data, null, 2) }]
            };

          case 'stop_service':
            const stopServiceResponse = await this.axiosInstance.get(`/services/${request.params.arguments?.uuid}/stop`);
            return {
              content: [{ type: 'text', text: JSON.stringify(stopServiceResponse.data, null, 2) }]
            };

          case 'restart_service':
            const restartServiceResponse = await this.axiosInstance.get(`/services/${request.params.arguments?.uuid}/restart`);
            return {
              content: [{ type: 'text', text: JSON.stringify(restartServiceResponse.data, null, 2) }]
            };

          // Applications
          case 'list_applications':
            const applicationsResponse = await this.axiosInstance.get('/applications');
            return {
              content: [{ type: 'text', text: JSON.stringify(applicationsResponse.data, null, 2) }]
            };

          case 'create_application':
            const createApplicationResponse = await this.axiosInstance.post('/applications', request.params.arguments);
            return {
              content: [{ type: 'text', text: JSON.stringify(createApplicationResponse.data, null, 2) }]
            };

          case 'start_application':
            const startAppResponse = await this.axiosInstance.get(`/applications/${request.params.arguments?.uuid}/start`);
            return {
              content: [{ type: 'text', text: JSON.stringify(startAppResponse.data, null, 2) }]
            };

          case 'stop_application':
            const stopAppResponse = await this.axiosInstance.get(`/applications/${request.params.arguments?.uuid}/stop`);
            return {
              content: [{ type: 'text', text: JSON.stringify(stopAppResponse.data, null, 2) }]
            };

          case 'restart_application':
            const restartAppResponse = await this.axiosInstance.get(`/applications/${request.params.arguments?.uuid}/restart`);
            return {
              content: [{ type: 'text', text: JSON.stringify(restartAppResponse.data, null, 2) }]
            };

          case 'execute_command_application':
            const executeResponse = await this.axiosInstance.post(
              `/applications/${request.params.arguments?.uuid}/execute`,
              { command: request.params.arguments?.command }
            );
            return {
              content: [{ type: 'text', text: JSON.stringify(executeResponse.data, null, 2) }]
            };

          // Deployments
          case 'list_deployments':
            const deploymentsResponse = await this.axiosInstance.get('/deployments');
            return {
              content: [{ type: 'text', text: JSON.stringify(deploymentsResponse.data, null, 2) }]
            };

          case 'get_deployment':
            const deploymentResponse = await this.axiosInstance.get(`/deployments/${request.params.arguments?.uuid}`);
            return {
              content: [{ type: 'text', text: JSON.stringify(deploymentResponse.data, null, 2) }]
            };

          // Private Keys
          case 'list_private_keys':
            const privateKeysResponse = await this.axiosInstance.get('/security/keys');
            return {
              content: [{ type: 'text', text: JSON.stringify(privateKeysResponse.data, null, 2) }]
            };

          case 'create_private_key':
            const createPrivateKeyResponse = await this.axiosInstance.post('/security/keys', request.params.arguments);
            return {
              content: [{ type: 'text', text: JSON.stringify(createPrivateKeyResponse.data, null, 2) }]
            };

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new McpError(
            ErrorCode.InternalError,
            `Coolify API error: ${error.response?.data?.message || error.message}`
          );
        }
        throw error;
      }
    });
  }

  async run() {
    const baseUrl = process.env.COOLIFY_BASE_URL;
    const token = process.env.COOLIFY_TOKEN;

    if (!baseUrl || !token) {
      throw new Error('COOLIFY_BASE_URL and COOLIFY_TOKEN environment variables are required');
    }

    this.initializeAxios({ baseUrl, token });
    this.setupToolHandlers();

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Coolify MCP server running on stdio');
  }
}

const server = new CoolifyServer();
server.run().catch(console.error);
