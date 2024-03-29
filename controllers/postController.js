const Post = require('../models/Post')
const sendGrid = require('@sendgrid/mail')
sendGrid.setApiKey(process.env.SENDGRIDAPIKEY)

exports.viewCreateScreen = function(req, res) {
  res.render('create-post')
}

exports.apiCreate = function(req, res) {
  let post = new Post(req.body, req.apiUser._id)
  post.create().then(function(newId) {
    res.json("Congrats. New Post have been created!")
  }).catch(function(errors) {
    res.json(errors)
  })
}

exports.create = function(req, res) {
  let post = new Post(req.body, req.session.user._id)
  post.create().then(function(newId) {
    sendGrid.send({
      to: 'j.p.ryan13@gmail.com',
      from: 'test@test.com',
      subject: 'Congrats on Creating a New Post!',
      text: 'You did it, great job of creating a New Post.',
      html: 'You did it, <strong>great job</strong> of creating a New Post'
    })
    req.flash("success", "New post successfully created!")
    req.session.save(() => res.redirect(`/post/${newId}`))
  }).catch(function(errors) {
    errors.forEach(error => req.flash("errors", error))
    req.session.save(() => res.redirect("/create-post"))
  })
}

exports.viewSingle = async function (req, res) {
    try {
        let post = await Post.findSinglePostById(req.params.id, req.visitorId)
        res.render('single-post', {post: post, title: post.title})
    } catch (err) {
        res.render('404')
    }
}

exports.viewEditScreen = async function(req, res) {
  try {
    let post = await Post.findSinglePostById(req.params.id, req.visitorId)
    if (post.isVisitorOwner) {
      res.render("edit-post", {post: post})
    } else {
      req.flash("errors", "You do not have permission to perform that action.")
      req.session.save(() => res.redirect("/"))
    }
  } catch (err){
    res.render("404")
  }
}

exports.edit = function (req, res) {
  let post = new Post(req.body, req.visitorId, req.params.id)
  post.update().then((status) => {
    // the post was successfully updated in the database
    // or the user did have permission, but there were validation errors
    if (status == "success") {
      // post was updated in the db
      req.flash("success", "Post successfully updated! Congratulations!")
      req.session.save(function() {
        res.redirect(`/post/${req.params.id}/edit`)
      })
    } else {
      post.errors.forEach(function(error) {
        req.flash("errors", error)
      })
      req.session.save(function() {
        res.redirect(`/post/${req.params.id}/edit`)
      })
    }
  }).catch(() => {
    // if a post with the req id does not exist
    // or if the current visitor is not the owner of the requested post
    req.flash("errors", "You do not have permisson to perform that action.")
    req.session.save(function() {
      res.redirect("/")
    })
  })
}

exports.delete = function (req, res) {
  Post.delete(req.params.id, req.visitorId).then(() => {
    req.flash("success", "Post successfully deleted!")
    req.session.save(() => res.redirect(`/profile/${req.session.user.username}`))
  }).catch(() => {
    req.flash("errors", "You do not have permission to perform that action!")
    req.session.save(() => res.redirect("/"))
  })
}


exports.search = function(req, res) {
  Post.search(req.body.searchTerm).then((posts) => {
    res.json(posts)
  }).catch(() => {
    res.json([])
  })
}