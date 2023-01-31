const { db, rabbitmq, log } = require('@cowellness/cw-micro-service')()
const cron = require('node-schedule')
const cronParser = require('cron-parser')
const axios = require('axios')

const constants = require('./cron.constants')
/**
 * @class CronController
 * @classdesc Controller Cron
 */
class CronController {
  constructor () {
    this.Cron = db.data.model('Cron')
  }

  find () {
    return this.Cron.find({})
  }

  findOne (filter) {
    return this.Cron.findOne(filter)
  }

  deleteOne (filter) {
    return this.Cron.deleteOne(filter)
  }

  async create (settings) {
    const name = settings.name
    const shouldUpdate = settings.update
    const cron = await this.Cron.findOne({ name })

    if (cron) {
      if (shouldUpdate) {
        this.schedule(settings)
        cron.settings = settings
        return cron.save()
      }
      return cron
    }
    this.schedule(settings)
    return this.Cron.create({
      name,
      settings
    })
  }

  validateSettings (settings) {
    try {
      if (settings.type === constants.TYPE_CRON && settings.crontab) {
        cronParser.parseExpression(settings.crontab)
        return true
      } else
      if (settings.type === constants.TYPE_SCHEDULE && settings.date) {
        return true
      }
      return false
    } catch (error) {
      return false
    }
  }

  schedule (settings) {
    const name = settings.name
    const existingJob = cron.scheduledJobs[name]
    const isValidSettings = this.validateSettings(settings)

    if (!isValidSettings) {
      log.info('CRON SCHEDULE FAILED: Invalid settings', settings.name, settings)
      return false
    }
    const rule = settings.type === 'cron' ? settings.crontab : settings.date

    if (existingJob) {
      existingJob.cancel()
    }
    cron.scheduleJob(name, rule, async () => {
      const result = await this.performActions(settings.commands)
      const deleted = await this.removejob(settings)

      log.info('CRON TRIGGERED: %s with value %j, commandsResult: %j', settings.name, settings, result)
      if (deleted) {
        log.info('CRON REMOVED: %s with value %j, commandsResult: %j', settings.name, settings, result)
      }
    })
    const job = cron.scheduledJobs[name]
    log.info('%s next run on: %s', settings.name, job.nextInvocation())

    return true
  }

  async removejob (settings) {
    const name = settings.name
    const existingJob = cron.scheduledJobs[name]

    if (settings.type === constants.TYPE_SCHEDULE && existingJob) {
      existingJob.cancel()
      await this.deleteOne({ name })
      return true
    }
    return false
  }

  cancelCurrentJobs () {
    Object.keys(cron.scheduledJobs).forEach(name => {
      const job = cron.scheduledJobs[name]
      job.cancel()
    })
  }

  async restartJobs () {
    this.cancelCurrentJobs()
    // should we reschedule a job if time in the past?
    const jobs = await this.find()
    const scheduledJobs = jobs.map(job => this.schedule(job.settings))
    const invalids = scheduledJobs.filter(job => !job)
    log.info('Total jobs restarted: %d, total failed: %d', scheduledJobs.length, invalids.length)

    return {
      total: scheduledJobs.length,
      invalids: invalids.length
    }
  }

  performActions (commands) {
    const actions = []

    commands.forEach(command => {
      log.info('CRON SENDING COMMAND %s', command.type)
      switch (command.type) {
        case constants.COMMAND_RABBITMQ:
          if (command.queue && command.msg) {
            const action = rabbitmq.send(command.queue, command.msg)
              .then(data => ({ [constants.COMMAND_RABBITMQ]: data }))
            actions.push(action)
          }
          break
        case constants.COMMAND_WEBHOOK:
          if (command.method && command.url) {
            const action = axios({
              method: command.method,
              url: command.url,
              data: command.body
            }).then(res => ({ [constants.COMMAND_WEBHOOK]: res.data }))
            actions.push(action)
          }
          break
      }
    })
    return Promise.all(actions)
  }
}

module.exports = CronController
