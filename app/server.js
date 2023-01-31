/**
 *  @fileOverview Start server app.
 */
const config = require('config')
const cw = require('@cowellness/cw-micro-service')(config)
const MY_NAME = 'daemon-' + Math.floor(100000 + Math.random() * 900000)

cw.autoStart()
cw.log.info('My virtual name is: ' + MY_NAME)

/**
 * only one CRON instance can be executed at the same time.
 *
 * I manage Master and Slaves with redis
 * if the master crashes, a slave takes its place.
 */

checkMasterFree(true)
setInterval(checkMasterFree, 30 * 1000)

async function checkMasterFree (first) {
  let master = await getMaster()
  if (!master) {
    await setMaster()
    master = await getMaster()
    if (master === MY_NAME) {
      cw.log.info('I AM THE MASTER ! ' + MY_NAME)
      startServer()
    }
  } else if (first) {
    cw.log.info('I AM SLAVE !')
  }
}

function getMaster () {
  return cw.redis.get('master')
}

function setMaster () {
  return cw.redis.set('master', MY_NAME, 'EX', 60)
}

function startServer () {
  cw.ctr.cron.restartJobs()
  setInterval(setMaster, 30 * 1000)
}
