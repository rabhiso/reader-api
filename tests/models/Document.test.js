const tap = require('tap')
const { destroyDB } = require('../integration/utils')
const { Reader } = require('../../models/Reader')
const { Document } = require('../../models/Document')
const { Publication } = require('../../models/Publication')
const parseurl = require('url').parse

const test = async app => {
  if (!process.env.POSTGRE_INSTANCE) {
    await app.initialize()
  }

  const reader = Object.assign(new Reader(), {
    id: '123456789abcdef',
    json: { name: 'J. Random Reader', userId: 'auth0|foo1545149868964' },
    userId: 'auth0|foo1545149868964',
    published: '2018-12-18T16:17:49.077Z',
    updated: '2018-12-18 16:17:49'
  })

  const documentObject = Object.assign(new Document(), {
    id: 'd66ffff8-06ad-4d72-88a2-4fddfb123a12',
    type: 'text/html',
    json: {
      type: 'Document',
      name: 'Chapter 1',
      content: 'Sample document content 1',
      position: 0
    },
    published: '2018-12-18T15:54:12.106Z',
    updated: '2018-12-18 15:54:12',
    reader: {
      id: '36dee441-3bf0-4e24-9d36-87bf01b27e89',
      json: { name: 'J. Random Reader', userId: 'auth0|foo1545148451777' },
      userId: 'auth0|foo1545148451777',
      published: '2018-12-18T15:54:11.865Z',
      updated: '2018-12-18 15:54:11'
    }
  })

  const publicationObject = new Publication()
  Object.assign(publicationObject, {
    description: null,
    json: {
      type: 'reader:Publication',
      name: 'Publication A',
      attributedTo: [{ type: 'Person', name: 'Sample Author' }]
    },
    attachment: [{ type: 'Document', content: 'content of document' }]
  })

  const createdReader = await Reader.createReader(
    'auth0|foo1545149868964',
    reader
  )

  let publication = await Reader.addPublication(
    createdReader,
    publicationObject
  )
  documentObject.publicationId = publication.id

  let documentId
  let document

  await tap.test('Create Document', async () => {
    let response = await Reader.addDocument(createdReader, documentObject)
    await tap.ok(response)
    await tap.ok(response instanceof Document)
    await tap.equal(response.readerId, createdReader.id)

    documentId = parseurl(response.url).path.substr(10)
  })

  await tap.test('Get document by short id', async () => {
    document = await Document.byShortId(documentId)
    await tap.type(document, 'object')
    await tap.equal(document.type, 'text/html')
    await tap.ok(document instanceof Document)
    // eager: reader
    await tap.type(document.reader, 'object')
    await tap.ok(document.reader instanceof Reader)
  })

  await tap.test('Document asRef', async () => {
    // make it clearer what asRef should keep and what it should remove
    const refDocument = document.asRef()
    await tap.ok(refDocument)
    await tap.equal(refDocument.type, 'Document')
    await tap.notOk(refDocument.attachment)
  })

  if (!process.env.POSTGRE_INSTANCE) {
    await app.terminate()
  }
  await destroyDB(app)
}

module.exports = test