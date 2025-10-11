import swaggerJsdoc from 'swagger-jsdoc';

export const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Agent API',
      version: '1.0.0',
      description: 'API for controlling and interacting with a Minecraft bot',
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
    ],
    tags: [
      { name: 'Core', description: 'Core bot operations' },
      { name: 'Bot', description: 'Bot status and actions' },
      { name: 'Chat', description: 'Chat interactions' },
    ],
    paths: {
      '/check': {
        get: {
          tags: ['Core'],
          summary: 'Health check',
          description: 'Check if the API server is running',
          responses: {
            '200': {
              description: 'API server is running',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      connected: { type: 'boolean', example: true },
                      timestamp: { type: 'string', example: '2023-06-01T12:00:00.000Z' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/connect': {
        post: {
          tags: ['Core'],
          summary: 'Connect bot',
          description: 'Connect the bot to the Minecraft server',
          responses: {
            '200': {
              description: 'Bot connected successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Connection failed',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: { type: 'string', example: 'Connect failed' },
                      message: { type: 'string', example: 'Connection timed out' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/disconnect': {
        post: {
          tags: ['Core'],
          summary: 'Disconnect bot',
          description: 'Disconnect the bot from the Minecraft server',
          responses: {
            '200': {
              description: 'Bot disconnected successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Disconnection failed',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: { type: 'string', example: 'Disconnect failed' },
                      message: { type: 'string', example: 'Error during disconnection' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/exit': {
        post: {
          tags: ['Core'],
          summary: 'Exit application',
          description: 'Disconnect the bot and exit the application',
          responses: {
            '200': {
              description: 'Exit successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Exit failed',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: { type: 'string', example: 'Exit failed' },
                      message: { type: 'string', example: 'Error during exit' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/bot/status': {
        get: {
          tags: ['Bot'],
          summary: 'Bot status',
          description: 'Get the current status of the bot',
          responses: {
            '200': {
              description: 'Bot status',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      connected: { type: 'boolean', example: true },
                      username: { type: 'string', example: 'BotName' },
                      health: { type: 'number', example: 20 },
                      food: { type: 'number', example: 20 },
                      position: {
                        type: 'object',
                        properties: {
                          x: { type: 'number', example: 100 },
                          y: { type: 'number', example: 64 },
                          z: { type: 'number', example: 200 },
                        },
                      },
                      dimension: { type: 'string', example: 'minecraft:overworld' },
                      gameMode: { type: 'string', example: 'survival' },
                      featuresStatus: { 
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            name: { type: 'string', example: 'pathfinding' },
                            status: { type: 'boolean', example: true },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/bot/command': {
        post: {
          tags: ['Bot'],
          summary: 'Execute command',
          description: 'Execute a bot command',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['command'],
                  properties: {
                    command: { type: 'string', example: 'goto 100 64 200' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Command executed successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      command: { type: 'string', example: 'goto 100 64 200' },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Invalid request',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: { type: 'string', example: 'Command is required' },
                    },
                  },
                },
              },
            },
            '503': {
              description: 'Bot not connected',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: { type: 'string', example: 'Bot is not connected' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/bot/inventory': {
        get: {
          tags: ['Bot'],
          summary: 'Bot inventory',
          description: 'Get the current inventory of the bot',
          responses: {
            '200': {
              description: 'Bot inventory',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      inventory: {
                        type: 'object',
                        additionalProperties: { type: 'number' },
                        example: { 'stone': 64, 'dirt': 32 },
                      },
                      totalItems: { type: 'number', example: 2 },
                      raw: { type: 'array', items: { type: 'object' } },
                    },
                  },
                },
              },
            },
            '503': {
              description: 'Bot not connected',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: { type: 'string', example: 'Bot is not connected' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/bot/entities': {
        get: {
          tags: ['Bot'],
          summary: 'Nearby entities',
          description: 'Get nearby entities around the bot',
          responses: {
            '200': {
              description: 'Nearby entities',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      entities: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'number' },
                            uuid: { type: 'string' },
                            type: { type: 'string' },
                            name: { type: 'string' },
                            username: { type: 'string' },
                            position: {
                              type: 'object',
                              properties: {
                                x: { type: 'number' },
                                y: { type: 'number' },
                                z: { type: 'number' },
                              },
                            },
                            distance: { type: 'number' },
                          },
                        },
                      },
                      count: { type: 'number' },
                    },
                  },
                },
              },
            },
            '503': {
              description: 'Bot not connected',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: { type: 'string', example: 'Bot is not connected' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/chat': {
        post: {
          tags: ['Chat'],
          summary: 'Send chat message',
          description: 'Send a chat message as the bot',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['message'],
                  properties: {
                    message: { type: 'string', example: 'Hello, world!' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Message sent successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Hello, world!' },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Invalid request',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: { type: 'string', example: 'Message is required' },
                    },
                  },
                },
              },
            },
            '503': {
              description: 'Bot not connected',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: { type: 'string', example: 'Bot is not connected' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [], // No need for file paths since we're defining everything inline
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;





