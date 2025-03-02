const { raw } = require('body-parser');
const { ensureAuthenticated } = require('../middleware/authenticate');
const roomSchema = require('../schemas/roomSchema');
const songSchema = require('../schemas/songSchema');
const uuid = require('uuid').v4;
const router = require('express').Router();

router.get('/newroom', ensureAuthenticated, async (req, res) => {
    var songs = await songSchema.find({}).sort({ songName: 1 });
    res.render('dashboard/newroom', { songs: songs, user: req.user});
})

router.post('/newroom', ensureAuthenticated, (req, res) => {
    const { name, playlist, currentSong, password, private } = req.body;
    console.log(req.body);
    var id = uuid();
    var room;
    if (private == true) {
        room = new roomSchema({
            name,
            author: req.user._id,
            id,
            users: [],
            playlist,
            //currentSong,
            private: true,
            password
        });
    } else {
        room = new roomSchema({
            name,
            author: req.user._id,
            id,
            users: [],
            private: false,
            password: '',
            playlist,
            //currentSong
        })
    }
    room.save().then(() => {
        res.send({roomId: id});
    }).catch(err => console.log(err))
})

router.get('/join', ensureAuthenticated, async (req, res)=> {
    const rooms = await roomSchema.find({private:false})
    res.render('dashboard/join', {user:req.user, rooms})
})
;
router.get('/joinPrivate/:id/:password', ensureAuthenticated, async (req, res) => {
    const room = await roomSchema.findOne({id: req.params.id});
    roomSchema.findOne({ id: req.params.id }, async (err, room) => {
        console.log(room);
        if (room.password == req.params.password) {
        var songs = await room.playlist.map(async song => await songSchema.findOne({ _id: song }));
        songs = await Promise.all(songs);
        songs = await songs.map(song => song.toObject());
        songs = await Promise.all(songs);
        songs = JSON.stringify(songs);
        if (room) {
            res.render('dashboard/room1', { room, roomid: req.params.id, user: req.user, socketurl: process.env.SOCKET_URL, songs: await songs, roomname: room.name });
        }
        else {
            res.redirect('/room/newroom');
        }}
        else {
            res.redirect('/room/join');
        }
    });
})

//join a audio room by :id
router.get('/join/:id', ensureAuthenticated, async (req, res) => {
    roomSchema.findOne({id: req.params.id}, async  (err, room) => {
        console.log(room);
        if (room.private){
            return res.send('This room is private');
        }
        var songs = await room.playlist.map(async song => await songSchema.findOne({_id: song}));
        songs = await Promise.all(songs);
        songs = await songs.map(song => song.toObject());
        songs = await Promise.all(songs);
        songs = JSON.stringify(songs);
        if (room) {
            res.render('dashboard/room1', {room, roomid: req.params.id, user: req.user, socketurl: process.env.SOCKET_URL, songs:await songs, roomname: room.name});
        }
        else {
            res.redirect('/room/newroom');
        }
    });
});



module.exports = router