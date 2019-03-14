const request = require('supertest')
const tap = require('tap')
const urlparse = require('url').parse
const {
  getToken,
  createUser,
  destroyDB,
  getActivityFromUrl
} = require('./utils')

const test = async app => {
  if (!process.env.POSTGRE_INSTANCE) {
    await app.initialize()
  }

  const token = getToken()
  const userId = await createUser(app, token)
  const userUrl = urlparse(userId).path
  let documentUrl
  let activityUrl
  let publicationUrl

  const createPubRes = await request(app)
    .post(`${userUrl}/activity`)
    .set('Host', 'reader-api.test')
    .set('Authorization', `Bearer ${token}`)
    .type(
      'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
    )
    .send(
      JSON.stringify({
        '@context': [
          'https://www.w3.org/ns/activitystreams',
          { reader: 'https://rebus.foundation/ns/reader' }
        ],
        type: 'Create',
        object: {
          type: 'reader:Publication',
          name: 'Publication A',
          attributedTo: [
            {
              type: 'Person',
              name: 'Sample Author'
            }
          ],
          totalItems: 0,
          attachment: []
        }
      })
    )

  createPubActivityUrl = createPubRes.get('Location')
  const createPubActivityObject = await getActivityFromUrl(
    app,
    createPubActivityUrl,
    token
  )
  publicationUrl = createPubActivityObject.object.id

  await tap.test('Create Document', async () => {
    const res = await request(app)
      .post(`${userUrl}/activity`)
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type(
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
      )
      .send(
        JSON.stringify({
          '@context': [
            'https://www.w3.org/ns/activitystreams',
            { reader: 'https://rebus.foundation/ns/reader' }
          ],
          type: 'Create',
          object: {
            type: 'Document',
            context: publicationUrl,
            name: 'Document A',
            content: 'This is the content of document A.'
          }
        })
      )
    await tap.equal(res.status, 201)
    await tap.type(res.get('Location'), 'string')
    activityUrl = res.get('Location')
  })

  await tap.test(
    'Try to create Document with invalid publication context',
    async () => {
      const res = await request(app)
        .post(`${userUrl}/activity`)
        .set('Host', 'reader-api.test')
        .set('Authorization', `Bearer ${token}`)
        .type(
          'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
        )
        .send(
          JSON.stringify({
            '@context': [
              'https://www.w3.org/ns/activitystreams',
              { reader: 'https://rebus.foundation/ns/reader' }
            ],
            type: 'Create',
            object: {
              type: 'Document',
              context: undefined,
              name: 'Document A',
              content: 'This is the content of document A.'
            }
          })
        )
      await tap.equal(res.status, 404)
      await tap.ok(res.error.text.startsWith('no publication found for'))
    }
  )

  await tap.test('Get Document', async () => {
    const activityObject = await getActivityFromUrl(app, activityUrl, token)
    documentUrl = activityObject.object.id

    const res = await request(app)
      .get(urlparse(documentUrl).path)
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type(
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
      )
    await tap.equal(res.statusCode, 200)

    const body = res.body
    await tap.type(body, 'object')
    await tap.equal(body.type, 'Document')
    await tap.type(body.id, 'string')
    await tap.type(body['@context'], 'object')
    await tap.ok(Array.isArray(body['@context']))
  })

  await tap.test(
    'Publication context should now include the document',
    async () => {
      const res = await request(app)
        .get(urlparse(publicationUrl).path)
        .set('Host', 'reader-api.test')
        .set('Authorization', `Bearer ${token}`)
        .type(
          'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
        )
      await tap.equal(res.statusCode, 200)

      const body = res.body
      await tap.type(body, 'object')
    }
  )

  await tap.test('Document Read Activity', async () => {
    const res = await request(app)
      .post(`${userUrl}/activity`)
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type(
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
      )
      .send(
        JSON.stringify({
          '@context': [
            'https://www.w3.org/ns/activitystreams',
            { reader: 'https://rebus.foundation/ns/reader' },
            { oa: 'http://www.w3.org/ns/oa#' }
          ],
          type: 'Read',
          object: { type: 'Document', id: documentUrl },
          context: publicationUrl,
          'oa:hasSelector': {
            type: 'XPathSelector',
            value: '/html/body/p[2]/table/tr[2]/td[3]/span'
          }
        })
      )

    await tap.equal(res.status, 201)
    await tap.type(res.get('Location'), 'string')
    activityUrl = res.get('Location')

    // making sure the position returned in the document is the latest

    await request(app)
      .post(`${userUrl}/activity`)
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type(
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
      )
      .send(
        JSON.stringify({
          '@context': [
            'https://www.w3.org/ns/activitystreams',
            { reader: 'https://rebus.foundation/ns/reader' },
            { oa: 'http://www.w3.org/ns/oa#' }
          ],
          type: 'Read',
          object: { type: 'Document', id: documentUrl },
          context: publicationUrl,
          'oa:hasSelector': {
            type: 'XPathSelector',
            value: '/html/body/p[2]/table/tr[2]/td[3]/span2'
          }
        })
      )

    const resDoc = await request(app)
      .get(urlparse(documentUrl).path)
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type(
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
      )
    await tap.equal(resDoc.statusCode, 200)

    const body = resDoc.body
    await tap.type(body, 'object')
    await tap.type(body.position, 'string')
    await tap.equal(body.position, '/html/body/p[2]/table/tr[2]/td[3]/span2')
  })

  await tap.test('Document Read activity for invalid document id', async () => {
    const res = await request(app)
      .post(`${userUrl}/activity`)
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type(
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
      )
      .send(
        JSON.stringify({
          '@context': [
            'https://www.w3.org/ns/activitystreams',
            { reader: 'https://rebus.foundation/ns/reader' },
            { oa: 'http://www.w3.org/ns/oa#' }
          ],
          type: 'Read',
          object: { type: 'Document', id: documentUrl + '123' },
          context: publicationUrl,
          'oa:hasSelector': {
            type: 'XPathSelector',
            value: '/html/body/p[2]/table/tr[2]/td[3]/span'
          }
        })
      )

    await tap.equal(res.statusCode, 404)
    await tap.ok(res.error.text.startsWith('document with id'))
  })

  await tap.test('Get Document that does not exist', async () => {
    const res = await request(app)
      .get(urlparse(documentUrl).path + 'abc')
      .set('Host', 'reader-api.test')
      .set('Authorization', `Bearer ${token}`)
      .type(
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
      )

    await tap.equal(res.statusCode, 404)
  })

  if (!process.env.POSTGRE_INSTANCE) {
    await app.terminate()
  }
  await destroyDB(app)
}

module.exports = test