const tap = require('tap')
const { destroyDB } = require('../integration/utils')
const { Reader } = require('../../models/Reader')
const { Tag } = require('../../models/Tag')
const crypto = require('crypto')

const test = async app => {
  if (!process.env.POSTGRE_INSTANCE) {
    await app.initialize()
  }
  const random = crypto.randomBytes(13).toString('hex')

  const reader = {
    name: 'J. Random Reader'
  }

  const tagObject = {
    type: 'reader:Stack',
    name: 'mystack'
  }

  const createdReader = await Reader.createReader(`auth0|foo${random}`, reader)

  await tap.test('Create Stack', async () => {
    let response = await Tag.createTag(createdReader.id, tagObject)
    await tap.ok(response)
    await tap.ok(response instanceof Tag)
    await tap.equal(response.readerId, createdReader.id)
    tagId = response.id
  })

  await tap.test('Get tag by id', async () => {
    let response = await Tag.byId(tagId)
    await tap.ok(response)
    await tap.ok(response instanceof Tag)
  })

  // tags probably don't need asRef

  if (!process.env.POSTGRE_INSTANCE) {
    await app.terminate()
  }
  await destroyDB(app)
}

module.exports = test