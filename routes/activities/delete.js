const { createActivityObject } = require('../../utils/utils')
const { Publication } = require('../../models/Publication')
const { Activity } = require('../../models/Activity')
const { Note } = require('../../models/Note')
const { Tag } = require('../../models/Tag')
const { urlToId } = require('../../utils/utils')

const handleDelete = async (req, res, reader) => {
  const body = req.body
  switch (body.object.type) {
    case 'Publication':
      const returned = await Publication.delete(urlToId(body.object.id))
      if (returned === null) {
        res
          .status(404)
          .send(
            `publication with id ${
              body.object.id
            } does not exist or has already been deleted`
          )
        break
      } else if (returned instanceof Error || !returned) {
        const message = returned
          ? returned.message
          : 'publication deletion failed'
        res.status(400).send(`delete publication error: ${message}`)
        break
      }
      const activityObjPub = createActivityObject(body, returned, reader)
      Activity.createActivity(activityObjPub)
        .then(activity => {
          res.status(201)
          res.set('Location', activity.url)
          res.end()
        })
        .catch(err => {
          res.status(400).send(`create activity error: ${err.message}`)
        })
      break

    case 'Note':
      const resultNote = await Note.delete(urlToId(body.object.id))
      if (resultNote === null) {
        res
          .status(404)
          .send(
            `note with id ${
              body.object.id
            } does not exist or has already been deleted`
          )
        break
      } else if (resultNote instanceof Error || !resultNote) {
        const message = resultNote ? resultNote.message : 'note deletion failed'
        res.status(400).send(`delete note error: ${message}`)
        break
      }
      const activityObjNote = createActivityObject(body, resultNote, reader)
      Activity.createActivity(activityObjNote)
        .then(activity => {
          res.status(201)
          res.set('Location', activity.url)
          res.end()
        })
        .catch(err => {
          res.status(400).send(`create activity error: ${err.message}`)
        })
      break

    case 'Tag':
      const resultTag = await Tag.deleteTag(urlToId(body.object.id))
      if (resultTag === null || resultTag === 0) {
        res
          .status(404)
          .send(
            `tag with id ${
              body.object.id
            } does not exist or has already been deleted`
          )
        break
      } else if (resultTag instanceof Error || !resultTag) {
        const message = resultTag ? resultTag.message : 'tag deletion failed'
        res.status(400).send(`delete tag error: ${message}`)
        break
      }
      const activityObjTag = createActivityObject(body, body.object.id, reader)
      Activity.createActivity(activityObjTag)
        .then(activity => {
          res.status(201)
          res.set('Location', activity.url)
          res.end()
        })
        .catch(err => {
          res.status(400).send(`create activity error: ${err.message}`)
        })
      break

    default:
      res.status(400).send(`cannot delete ${body.object.type}`)
      break
  }
}

module.exports = { handleDelete }
