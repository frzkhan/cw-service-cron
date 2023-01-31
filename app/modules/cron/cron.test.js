const config = require('config')
const cw = require('@cowellness/cw-micro-service')(config)

beforeAll(async () => {
  await cw.autoStart()
})
afterAll(async () => {
  await cw.stopAll()
})

describe('Test Cron service', () => {
  it('should create a cron task', async () => {
    const msg = await cw.rabbitmq.sendAndRead('/cron/append', {
      name: 'settings:cron:test',
      type: 'schedule',
      update: false,
      date: Date.now() + (2 * 1000),
      commands: []
    })

    expect(msg.data.name).toEqual('settings:cron:test')
    expect(msg.data._id).not.toEqual(undefined)
  })
  it('should get info on a task', async () => {
    const msg = await cw.rabbitmq.sendAndRead('/cron/info', 'settings:cron:test')

    expect(msg.data.name).toEqual('settings:cron:test')
    expect(msg.data._id).not.toEqual(undefined)
  })
  it('should delete a task', async () => {
    const msg = await cw.rabbitmq.sendAndRead('/cron/delete', 'settings:cron:test')

    expect(msg.data.deletedCount).toEqual(1)
  })
})
