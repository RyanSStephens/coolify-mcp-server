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
        name: 'coolify-server',
        version: '0.1.0',
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
          description: 'Get Coolify version information',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        },
        {
          name: 'health_check',
          description: 'Check Coolify API health status',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        },
        // Teams
        {
          name: 'list_teams',
          description: 'List all teams the authenticated user has access to',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        },
        {
          name: 'get_team',
          description: 'Get details of a specific team',
          inputSchema: {
            type: 'object',
            properties: {
              team_id: {
                type: 'string',
                description: 'UUID of the team to retrieve'
              }
            },
            required: ['team_id']
          }
        },
        {
          name: 'get_current_team',
          description: 'Get details of the current team',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        },
        {
          name: 'get_current_team_members',
          description: 'Get members of the current team',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        },
        // Servers
        {
          name: 'list_servers',
          description: 'List all servers',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        },
        {
          name: 'create_server',
          description: 'Create a new server',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              ip: { type: 'string' },
              port: { type: 'number' },
              user: { type: 'string' },
              private_key_uuid: { type: 'string' },
              is_build_server: { type: 'boolean' },
              instant_validate: { type: 'boolean' },
              proxy_type: { type: 'string' }
            },
            required: ['name', 'ip', 'port', 'user', 'private_key_uuid']
          }
        },
        {
          name: 'validate_server',
          description: 'Validate a server configuration',
          inputSchema: {
            type: 'object',
            properties: {
              uuid: {
                type: 'string',
                description: 'UUID of the server to validate'
              }
            },
            required: ['uuid']
          }
        },
        {
          name: 'get_server_resources',
          description: 'Get server resource usage information',
          inputSchema: {
            type: 'object',
            properties: {
              uuid: {
                type: 'string',
                description: 'UUID of the server'
              }
            },
            required: ['uuid']
          }
        },
        {
          name: 'get_server_domains',
          description: 'Get domains configured for a server',
          inputSchema: {
            type: 'object',
            properties: {
              uuid: {
                type: 'string',
                description: 'UUID of the server'
              }
            },
            required: ['uuid']
          }
        },
        // Services
        {
          name: 'list_services',
          description: 'List all services',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        },
        {
          name: 'create_service',
          description: 'Create a new service',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              server_uuid: { type: 'string' },
              project_uuid: { type: 'string' },
              environment_name: { type: 'string' },
              environment_uuid: { type: 'string' }
            },
            required: ['name', 'server_uuid', 'project_uuid']
          }
        },
        {
          name: 'start_service',
          description: 'Start a service by UUID',
          inputSchema: {
            type: 'object',
            properties: {
              uuid: {
                type: 'string',
                description: 'UUID of the service to start'
              }
            },
            required: ['uuid']
          }
        },
        {
          name: 'stop_service',
          description: 'Stop a service by UUID',
          inputSchema: {
            type: 'object',
            properties: {
              uuid: {
                type: 'string',
                description: 'UUID of the service to stop'
              }
            },
            required: ['uuid']
          }
        },
        {
          name: 'restart_service',
          description: 'Restart a service by UUID',
          inputSchema: {
            type: 'object',
            properties: {
              uuid: {
                type: 'string',
                description: 'UUID of the service to restart'
              }
            },
            required: ['uuid']
          }
        },
        // Applications
        {
          name: 'list_applications',
          description: 'List all applications',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        },
        {
          name: 'create_application',
          description: 'Create a new application',
          inputSchema: {
            type: 'object',
            properties: {
              project_uuid: { type: 'string' },
              environment_name: { type: 'string' },
              environment_uuid: { type: 'string' },
              git_repository: { type: 'string' },
              ports_exposes: { type: 'string' },
              destination_uuid: { type: 'string' }
            },
            required: ['project_uuid', 'environment_name', 'destination_uuid']
          }
        },
        {
          name: 'start_application',
          description: 'Start an application by UUID',
          inputSchema: {
            type: 'object',
            properties: {
              uuid: {
                type: 'string',
                description: 'UUID of the application to start'
              }
            },
            required: ['uuid']
          }
        },
        {
          name: 'stop_application',
          description: 'Stop an application by UUID',
          inputSchema: {
            type: 'object',
            properties: {
              uuid: {
                type: 'string',
                description: 'UUID of the application to stop'
              }
            },
            required: ['uuid']
          }
        },
        {
          name: 'restart_application',
          description: 'Restart an application by UUID',
          inputSchema: {
            type: 'object',
            properties: {
              uuid: {
                type: 'string',
                description: 'UUID of the application to restart'
              }
            },
            required: ['uuid']
          }
        },
        {
          name: 'execute_command_application',
          description: 'Execute a command in an application container',
          inputSchema: {
            type: 'object',
            properties: {
              uuid: {
                type: 'string',
                description: 'UUID of the application'
              },
              command: {
                type: 'string',
                description: 'Command to execute'
              }
            },
            required: ['uuid', 'command']
          }
        },
        // Deployments
        {
          name: 'list_deployments',
          description: 'List all deployments',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        },
        {
          name: 'get_deployment',
          description: 'Get deployment details by UUID',
          inputSchema: {
            type: 'object',
            properties: {
              uuid: {
                type: 'string',
                description: 'UUID of the deployment'
              }
            },
            required: ['uuid']
          }
        },
        // Private Keys
        {
          name: 'list_private_keys',
          description: 'List all private keys',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        },
        {
          name: 'create_private_key',
          description: 'Create a new private key',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              private_key: { type: 'string' }
            },
            required: ['name', 'private_key']
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
