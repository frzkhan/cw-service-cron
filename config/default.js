const path = require('path')
const basepath = path.join(__dirname, '..', 'app')

module.exports = {
  service: 'cron',
  fastify: { active: false, port: 3010, prefix: '/api/cron' },
  rabbitmq: { active: true, server: 'localhost:15672', user: 'dev', password: 'dev123' },
  redis: { active: true, server: 'localhost', port: 16379 },
  logger: { level: 'debug' },
  basepath,
  mongodb: {
    active: true,
    server: 'localhost',
    port: '37017',
    user: '',
    password: '',
    debug: true,
    databases: [
      {
        name: 'data',
        db: 'cron',
        options: {}
      }
    ]
  }
}
