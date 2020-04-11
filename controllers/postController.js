const Post = require('../models/Post')

exports.viewCreateScreen = function(req, res) {
  res.render('create-post')
}

exports.create = function(req, res) {
  let post = new Post(req.body, req.session.user._id)
  post.create().then(function() {
    res.send("New post created.")
  }).catch(function(errors) {
    res.send(errors)
  })
}

exports.viewSingle = async function (req, res) {
    try {
        let post = await Post.findSinglePostById(req.params.id, req.visitorId)
        res.render('single-post', {post: post})
    } catch (err) {
        res.render('404')
    }
}

exports.viewEditScreen = async function (req, res) {
    try {
      // ask post model for data
      let post = await Post.findSinglePostById(req.params.id)
      // render edit screen template
      res.render("edit-post", {post: post})

    } catch (err) {
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