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
      { name: 'Goals', description: 'Goal management' },
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
      // '/goals': {
      //   get: {
      //     tags: ['Goals'],
      //     summary: 'Get all goals',
      //     description: 'Get all goals with optional filters',
      //     parameters: [
      //       {
      //         name: 'status',
      //         in: 'query',
      //         schema: {
      //           type: 'string',
      //           enum: ['active', 'completed', 'archived', 'pending'],
      //         },
      //         description: 'Filter goals by status',
      //       },
      //       {
      //         name: 'type',
      //         in: 'query',
      //         schema: {
      //           type: 'string',
      //           enum: ['discovery', 'goal', 'command'],
      //         },
      //         description: 'Filter goals by type',
      //       },
      //     ],
      //     responses: {
      //       '200': {
      //         description: 'List of goals',
      //         content: {
      //           'application/json': {
      //             schema: {
      //               type: 'object',
      //               properties: {
      //                 goals: {
      //                   type: 'array',
      //                   items: {
      //                     type: 'object',
      //                     properties: {
      //                       id: { type: 'string' },
      //                       name: { type: 'string' },
      //                       type: { type: 'string', enum: ['discovery', 'goal', 'command'] },
      //                       priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
      //                       status: { type: 'string', enum: ['active', 'completed', 'archived', 'pending'] },
      //                       milestones: {
      //                         type: 'array',
      //                         items: {
      //                           type: 'object',
      //                           properties: {
      //                             id: { type: 'string' },
      //                             name: { type: 'string' },
      //                             type: { type: 'string' },
      //                             priority: { type: 'string' },
      //                             status: { type: 'string' },
      //                             createdAt: { type: 'number' },
      //                             completedAt: { type: 'number' },
      //                             parentGoalId: { type: 'string' },
      //                           },
      //                         },
      //                       },
      //                       createdAt: { type: 'number' },
      //                       completedAt: { type: 'number' },
      //                       progress: { type: 'number' },
      //                     },
      //                   },
      //                 },
      //                 count: { type: 'number' },
      //               },
      //             },
      //           },
      //         },
      //       },
      //       '503': {
      //         description: 'Bot not connected',
      //         content: {
      //           'application/json': {
      //             schema: {
      //               type: 'object',
      //               properties: {
      //                 error: { type: 'string', example: 'Bot is not connected' },
      //               },
      //             },
      //           },
      //         },
      //       },
      //     },
      //   },
      //   post: {
      //     tags: ['Goals'],
      //     summary: 'Create a goal',
      //     description: 'Create a new goal',
      //     requestBody: {
      //       required: true,
      //       content: {
      //         'application/json': {
      //           schema: {
      //             type: 'object',
      //             required: ['name'],
      //             properties: {
      //               name: { type: 'string', example: 'Find diamonds' },
      //               type: { 
      //                 type: 'string', 
      //                 enum: ['discovery', 'goal', 'command'],
      //                 default: 'goal'
      //               },
      //               priority: { 
      //                 type: 'string', 
      //                 enum: ['critical', 'high', 'medium', 'low'],
      //                 default: 'medium'
      //               },
      //               milestones: {
      //                 type: 'array',
      //                 items: {
      //                   type: 'object',
      //                   properties: {
      //                     name: { type: 'string' },
      //                     type: { type: 'string' },
      //                     priority: { type: 'string' },
      //                     execute: {
      //                       oneOf: [
      //                         { type: 'string', example: 'goto 100 64 200' },
      //                         { 
      //                           type: 'array', 
      //                           items: { type: 'string' },
      //                           example: ['goto 100 64 200', 'mine diamond_ore 5']
      //                         }
      //                       ],
      //                       description: 'Command(s) to execute when milestone is activated'
      //                     }
      //                   },
      //                   required: ['name'],
      //                 },
      //               },
      //               activate: { type: 'boolean', default: false },
      //               execute: {
      //                 oneOf: [
      //                   { type: 'string', example: 'explore 50' },
      //                   { 
      //                     type: 'array', 
      //                     items: { type: 'string' },
      //                     example: ['goto 100 64 200', 'explore 50']
      //                   }
      //                 ],
      //                 description: 'Command(s) to execute when goal is activated'
      //               }
      //             },
      //           },
      //         },
      //       },
      //     },
      //     responses: {
      //       '201': {
      //         description: 'Goal created successfully',
      //         content: {
      //           'application/json': {
      //             schema: {
      //               type: 'object',
      //               properties: {
      //                 success: { type: 'boolean', example: true },
      //                 goal: {
      //                   type: 'object',
      //                   properties: {
      //                     id: { type: 'string' },
      //                     name: { type: 'string' },
      //                     type: { type: 'string' },
      //                     priority: { type: 'string' },
      //                     status: { type: 'string' },
      //                     milestones: { type: 'array', items: { type: 'object' } },
      //                     createdAt: { type: 'number' },
      //                     progress: { type: 'number' },
      //                   },
      //                 },
      //               },
      //             },
      //           },
      //         },
      //       },
      //       '400': {
      //         description: 'Invalid request',
      //         content: {
      //           'application/json': {
      //             schema: {
      //               type: 'object',
      //               properties: {
      //                 error: { type: 'string', example: 'Goal name is required' },
      //               },
      //             },
      //           },
      //         },
      //       },
      //       '503': {
      //         description: 'Bot not connected',
      //         content: {
      //           'application/json': {
      //             schema: {
      //               type: 'object',
      //               properties: {
      //                 error: { type: 'string', example: 'Bot is not connected' },
      //               },
      //             },
      //           },
      //         },
      //       },
      //     },
      //   },
      // },
      // '/goals/{goalId}': {
      //   get: {
      //     tags: ['Goals'],
      //     summary: 'Get a goal',
      //     description: 'Get a specific goal by ID',
      //     parameters: [
      //       {
      //         name: 'goalId',
      //         in: 'path',
      //         required: true,
      //         schema: { type: 'string' },
      //         description: 'Goal ID',
      //       },
      //     ],
      //     responses: {
      //       '200': {
      //         description: 'Goal details',
      //         content: {
      //           'application/json': {
      //             schema: {
      //               type: 'object',
      //               properties: {
      //                 id: { type: 'string' },
      //                 name: { type: 'string' },
      //                 type: { type: 'string' },
      //                 priority: { type: 'string' },
      //                 status: { type: 'string' },
      //                 milestones: { type: 'array', items: { type: 'object' } },
      //                 createdAt: { type: 'number' },
      //                 completedAt: { type: 'number' },
      //                 progress: { type: 'number' },
      //               },
      //             },
      //           },
      //         },
      //       },
      //       '404': {
      //         description: 'Goal not found',
      //         content: {
      //           'application/json': {
      //             schema: {
      //               type: 'object',
      //               properties: {
      //                 error: { type: 'string', example: 'Goal not found' },
      //               },
      //             },
      //           },
      //         },
      //       },
      //       '503': {
      //         description: 'Bot not connected',
      //         content: {
      //           'application/json': {
      //             schema: {
      //               type: 'object',
      //               properties: {
      //                 error: { type: 'string', example: 'Bot is not connected' },
      //               },
      //             },
      //           },
      //         },
      //       },
      //     },
      //   },
      //   put: {
      //     tags: ['Goals'],
      //     summary: 'Update a goal',
      //     description: 'Update a specific goal by ID',
      //     parameters: [
      //       {
      //         name: 'goalId',
      //         in: 'path',
      //         required: true,
      //         schema: { type: 'string' },
      //         description: 'Goal ID',
      //       },
      //     ],
      //     requestBody: {
      //       required: true,
      //       content: {
      //         'application/json': {
      //           schema: {
      //             type: 'object',
      //             properties: {
      //               name: { type: 'string' },
      //               type: { type: 'string', enum: ['discovery', 'goal', 'command'] },
      //               priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
      //               status: { type: 'string', enum: ['active', 'completed', 'archived', 'pending'] },
      //             },
      //           },
      //         },
      //       },
      //     },
      //     responses: {
      //       '200': {
      //         description: 'Goal updated successfully',
      //         content: {
      //           'application/json': {
      //             schema: {
      //               type: 'object',
      //               properties: {
      //                 success: { type: 'boolean', example: true },
      //                 goal: { type: 'object' },
      //               },
      //             },
      //           },
      //         },
      //       },
      //       '404': {
      //         description: 'Goal not found',
      //         content: {
      //           'application/json': {
      //             schema: {
      //               type: 'object',
      //               properties: {
      //                 error: { type: 'string', example: 'Goal not found' },
      //               },
      //             },
      //           },
      //         },
      //       },
      //       '503': {
      //         description: 'Bot not connected',
      //         content: {
      //           'application/json': {
      //             schema: {
      //               type: 'object',
      //               properties: {
      //                 error: { type: 'string', example: 'Bot is not connected' },
      //               },
      //             },
      //           },
      //         },
      //       },
      //     },
      //   },
      //   delete: {
      //     tags: ['Goals'],
      //     summary: 'Delete a goal',
      //     description: 'Delete a specific goal by ID',
      //     parameters: [
      //       {
      //         name: 'goalId',
      //         in: 'path',
      //         required: true,
      //         schema: { type: 'string' },
      //         description: 'Goal ID',
      //       },
      //     ],
      //     responses: {
      //       '200': {
      //         description: 'Goal deleted successfully',
      //         content: {
      //           'application/json': {
      //             schema: {
      //               type: 'object',
      //               properties: {
      //                 success: { type: 'boolean', example: true },
      //               },
      //             },
      //           },
      //         },
      //       },
      //       '404': {
      //         description: 'Goal not found',
      //         content: {
      //           'application/json': {
      //             schema: {
      //               type: 'object',
      //               properties: {
      //                 error: { type: 'string', example: 'Goal not found' },
      //               },
      //             },
      //           },
      //         },
      //       },
      //       '503': {
      //         description: 'Bot not connected',
      //         content: {
      //           'application/json': {
      //             schema: {
      //               type: 'object',
      //               properties: {
      //                 error: { type: 'string', example: 'Bot is not connected' },
      //               },
      //             },
      //           },
      //         },
      //       },
      //     },
      //   },
      // },
      // '/goals/{goalId}/milestones': {
      //   post: {
      //     tags: ['Goals'],
      //     summary: 'Create a milestone',
      //     description: 'Create a new milestone for a goal',
      //     parameters: [
      //       {
      //         name: 'goalId',
      //         in: 'path',
      //         required: true,
      //         schema: { type: 'string' },
      //         description: 'Goal ID',
      //       },
      //     ],
      //     requestBody: {
      //       required: true,
      //       content: {
      //         'application/json': {
      //           schema: {
      //             type: 'object',
      //             required: ['name'],
      //             properties: {
      //               name: { type: 'string', example: 'Find cave' },
      //               type: { 
      //                 type: 'string', 
      //                 enum: ['discovery', 'goal', 'command'],
      //                 default: 'command'
      //               },
      //               priority: { 
      //                 type: 'string', 
      //                 enum: ['critical', 'high', 'medium', 'low'],
      //                 default: 'medium'
      //               },
      //               execute: {
      //                 oneOf: [
      //                   { type: 'string', example: 'mine stone 10' },
      //                   { 
      //                     type: 'array', 
      //                     items: { type: 'string' },
      //                     example: ['goto 100 64 200', 'mine stone 10']
      //                   }
      //                 ],
      //                 description: 'Command(s) to execute when milestone is activated'
      //               }
      //             },
      //           },
      //         },
      //       },
      //     },
      //     responses: {
      //       '201': {
      //         description: 'Milestone created successfully',
      //         content: {
      //           'application/json': {
      //             schema: {
      //               type: 'object',
      //               properties: {
      //                 success: { type: 'boolean', example: true },
      //                 milestone: { type: 'object' },
      //               },
      //             },
      //           },
      //         },
      //       },
      //       '400': {
      //         description: 'Invalid request',
      //         content: {
      //           'application/json': {
      //             schema: {
      //               type: 'object',
      //               properties: {
      //                 error: { type: 'string', example: 'Milestone name is required' },
      //               },
      //             },
      //           },
      //         },
      //       },
      //       '404': {
      //         description: 'Goal not found',
      //         content: {
      //           'application/json': {
      //             schema: {
      //               type: 'object',
      //               properties: {
      //                 error: { type: 'string', example: 'Goal not found' },
      //               },
      //             },
      //           },
      //         },
      //       },
      //       '503': {
      //         description: 'Bot not connected',
      //         content: {
      //           'application/json': {
      //             schema: {
      //               type: 'object',
      //               properties: {
      //                 error: { type: 'string', example: 'Bot is not connected' },
      //               },
      //             },
      //           },
      //         },
      //       },
      //     },
      //   },
      // },
      // '/goals/milestones/{milestoneId}': {
      //   put: {
      //     tags: ['Goals'],
      //     summary: 'Update a milestone',
      //     description: 'Update a specific milestone by ID',
      //     parameters: [
      //       {
      //         name: 'milestoneId',
      //         in: 'path',
      //         required: true,
      //         schema: { type: 'string' },
      //         description: 'Milestone ID',
      //       },
      //     ],
      //     requestBody: {
      //       required: true,
      //       content: {
      //         'application/json': {
      //           schema: {
      //             type: 'object',
      //             properties: {
      //               name: { type: 'string' },
      //               type: { type: 'string', enum: ['discovery', 'goal', 'command'] },
      //               priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
      //               status: { type: 'string', enum: ['active', 'completed', 'archived', 'pending'] },
      //             },
      //           },
      //         },
      //       },
      //     },
      //     responses: {
      //       '200': {
      //         description: 'Milestone updated successfully',
      //         content: {
      //           'application/json': {
      //             schema: {
      //               type: 'object',
      //               properties: {
      //                 success: { type: 'boolean', example: true },
      //                 milestone: { type: 'object' },
      //               },
      //             },
      //           },
      //         },
      //       },
      //       '404': {
      //         description: 'Milestone not found',
      //         content: {
      //           'application/json': {
      //             schema: {
      //               type: 'object',
      //               properties: {
      //                 error: { type: 'string', example: 'Milestone not found' },
      //               },
      //             },
      //           },
      //         },
      //       },
      //       '503': {
      //         description: 'Bot not connected',
      //         content: {
      //           'application/json': {
      //             schema: {
      //               type: 'object',
      //               properties: {
      //                 error: { type: 'string', example: 'Bot is not connected' },
      //               },
      //             },
      //           },
      //         },
      //       },
      //     },
      //   },
      //   delete: {
      //     tags: ['Goals'],
      //     summary: 'Delete a milestone',
      //     description: 'Delete a specific milestone by ID',
      //     parameters: [
      //       {
      //         name: 'milestoneId',
      //         in: 'path',
      //         required: true,
      //         schema: { type: 'string' },
      //         description: 'Milestone ID',
      //       },
      //     ],
      //     responses: {
      //       '200': {
      //         description: 'Milestone deleted successfully',
      //         content: {
      //           'application/json': {
      //             schema: {
      //               type: 'object',
      //               properties: {
      //                 success: { type: 'boolean', example: true },
      //               },
      //             },
      //           },
      //         },
      //       },
      //       '404': {
      //         description: 'Milestone not found',
      //         content: {
      //           'application/json': {
      //             schema: {
      //               type: 'object',
      //               properties: {
      //                 error: { type: 'string', example: 'Milestone not found' },
      //               },
      //             },
      //           },
      //         },
      //       },
      //       '503': {
      //         description: 'Bot not connected',
      //         content: {
      //           'application/json': {
      //             schema: {
      //               type: 'object',
      //               properties: {
      //                 error: { type: 'string', example: 'Bot is not connected' },
      //               },
      //             },
      //           },
      //         },
      //       },
      //     },
      //   },
      // },
      // '/goals/{goalId}/complete': {
      //   put: {
      //     tags: ['Goals'],
      //     summary: 'Complete a goal',
      //     description: 'Mark a goal as completed',
      //     parameters: [
      //       {
      //         name: 'goalId',
      //         in: 'path',
      //         required: true,
      //         schema: { type: 'string' },
      //         description: 'Goal ID',
      //       },
      //     ],
      //     responses: {
      //       '200': {
      //         description: 'Goal completed successfully',
      //         content: {
      //           'application/json': {
      //             schema: {
      //               type: 'object',
      //               properties: {
      //                 success: { type: 'boolean', example: true },
      //               },
      //             },
      //           },
      //         },
      //       },
      //       '404': {
      //         description: 'Goal not found',
      //         content: {
      //           'application/json': {
      //             schema: {
      //               type: 'object',
      //               properties: {
      //                 error: { type: 'string', example: 'Goal not found or already completed' },
      //               },
      //             },
      //           },
      //         },
      //       },
      //       '503': {
      //         description: 'Bot not connected',
      //         content: {
      //           'application/json': {
      //             schema: {
      //               type: 'object',
      //               properties: {
      //                 error: { type: 'string', example: 'Bot is not connected' },
      //               },
      //             },
      //           },
      //         },
      //       },
      //     },
      //   },
      // },
      // '/goals/milestones/{milestoneId}/complete': {
      //   put: {
      //     tags: ['Goals'],
      //     summary: 'Complete a milestone',
      //     description: 'Mark a milestone as completed',
      //     parameters: [
      //       {
      //         name: 'milestoneId',
      //         in: 'path',
      //         required: true,
      //         schema: { type: 'string' },
      //         description: 'Milestone ID',
      //       },
      //     ],
      //     responses: {
      //       '200': {
      //         description: 'Milestone completed successfully',
      //         content: {
      //           'application/json': {
      //             schema: {
      //               type: 'object',
      //               properties: {
      //                 success: { type: 'boolean', example: true },
      //               },
      //             },
      //           },
      //         },
      //       },
      //       '404': {
      //         description: 'Milestone not found',
      //         content: {
      //           'application/json': {
      //             schema: {
      //               type: 'object',
      //               properties: {
      //                 error: { type: 'string', example: 'Milestone not found or already completed' },
      //               },
      //             },
      //           },
      //         },
      //       },
      //       '503': {
      //         description: 'Bot not connected',
      //         content: {
      //           'application/json': {
      //             schema: {
      //               type: 'object',
      //               properties: {
      //                 error: { type: 'string', example: 'Bot is not connected' },
      //               },
      //             },
      //           },
      //         },
      //       },
      //     },
      //   },
      // },
      // '/goals/{goalId}/activate': {
      //   put: {
      //     tags: ['Goals'],
      //     summary: 'Activate a goal',
      //     description: 'Activate a goal and optionally a milestone',
      //     parameters: [
      //       {
      //         name: 'goalId',
      //         in: 'path',
      //         required: true,
      //         schema: { type: 'string' },
      //         description: 'Goal ID',
      //       },
      //     ],
      //     requestBody: {
      //       content: {
      //         'application/json': {
      //           schema: {
      //             type: 'object',
      //             properties: {
      //               milestoneId: { type: 'string', description: 'Optional milestone ID to activate' },
      //             },
      //           },
      //         },
      //       },
      //     },
      //     responses: {
      //       '200': {
      //         description: 'Goal activated successfully',
      //         content: {
      //           'application/json': {
      //             schema: {
      //               type: 'object',
      //               properties: {
      //                 success: { type: 'boolean', example: true },
      //                 goal: { type: 'object' },
      //                 activeMilestone: { type: 'object' },
      //               },
      //             },
      //           },
      //         },
      //       },
      //       '404': {
      //         description: 'Goal or milestone not found',
      //         content: {
      //           'application/json': {
      //             schema: {
      //               type: 'object',
      //               properties: {
      //                 error: { type: 'string', example: 'Goal not found' },
      //               },
      //             },
      //           },
      //         },
      //       },
      //       '503': {
      //         description: 'Bot not connected',
      //         content: {
      //           'application/json': {
      //             schema: {
      //               type: 'object',
      //               properties: {
      //                 error: { type: 'string', example: 'Bot is not connected' },
      //               },
      //             },
      //           },
      //         },
      //       },
      //     },
      //   },
      // },
    },
  },
  apis: [], // No need for file paths since we're defining everything inline
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;





