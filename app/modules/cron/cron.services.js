const { ctr, rabbitmq, log } = require('@cowellness/cw-micro-service')()

rabbitmq.consume('/cron/append', async (msg) => {
  const settings = msg.data
  log.info('CREATING CRON: %s with value %j', settings.name, settings)

  return ctr.cron.create(settings)
})

rabbitmq.consume('/cron/info', (msg) => {
  const name = msg.data
  log.info('FETCHING CRON INFO: %s', name)

  return ctr.cron.findOne({ name })
})

rabbitmq.consume('/cron/delete', (msg) => {
  const name = msg.data
  log.info('DELETING CRON: %s', name)

  return ctr.cron.deleteOne({ name })
})
