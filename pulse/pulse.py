##############################################################################
# Pulse Backend
# Stores data in redis and uses Crossbar to act as a conduit between the
# pulse hardware and web frontend
###############################################################################

import sys

from twisted.internet.defer import inlineCallbacks
from twisted.logger import Logger

from autobahn.twisted.util import sleep
from autobahn import wamp
from autobahn.twisted.wamp import ApplicationSession
from autobahn.wamp.exception import ApplicationError

from redis import StrictRedis
from redis.exceptions import ConnectionError

import tweetpony

import settings as s
from data import PulseData

class PulseBackend(ApplicationSession):

    log = Logger()

    def __init__(self, config):
        ApplicationSession.__init__(self, config)
        self.init()

    def init(self):
        self.log.info("Pulse Backend Init")

        self.r = StrictRedis(host=s.REDIS_HOST, port=s.REDIS_PORT)
        try:
            if self.r.ping():
                self.log.info("Redis connected.")
        except ConnectionError:
            self.log.error("Error: Redis server not available.")
        self.d = PulseData(self.r)

        try:
            self.t = tweetpony.API(consumer_key=s.TWITTER_CONSUMER_KEY, consumer_secret=s.TWITTER_CONSUMER_SECRET, access_token=s.TWITTER_ACCESS_TOKEN, access_token_secret=s.TWITTER_ACCESS_SECRET)
        except tweetpony.APIError as err:
            self.log.error("Error: Twitter failed to authenticate. {}: {}".format(err.code, err.description))
        else:
            self.log.info("Twitter authenticated.")

        self.enabled = False

        self.currentqn = int(self.d.queueCount()) 
        self.current = {
                'isplaying': False,
                'player': None,
                'song': None,
                'artist': None}

        return

    @wamp.register(u'com.emfpulse.songs.update')
    def updateSongsList(self, songs):
        self.d.clearSongs()
        self.log.info("Song List Update: {}".format(len(songs)))
        for song in songs:
            self.d.addSong(song['name'],song['artist'])
            self.log.info("Song: {} - {}".format(song['artist'],song['name']))
    
    @wamp.register(u'com.emfpulse.songs.get')
    def getSongsList(self):
        return {'songs': [{'name': 'Test', 'artist': 'two'}]}
        return {'songs': self.d.getSongs()}

    @wamp.register(u'com.emfpulse.leaderboards.getforsong')
    def getLeaderboardForSong(self, song, artist):
        return self.d.getLeaderboard(10, song=song, artist=artist)

    @wamp.register(u'com.emfpulse.leaderboards.getall')
    def getLeaderboardForAll(self):
        return self.d.getLeaderboard(10)

    @wamp.register(u'com.emfpulse.queue.new')
    def addNewPlayerToQueue(self, name, song_name, song_artist):
        queue_number = self.d.addPlayer(name, song_name, song_artist)
        self.log.info("New Player In Queue: {} {}, {} - {}".format(queue_number, name, song_artist, song_name))
        
        self.publish('com.emfpulse.queue', {'queue_total': self.d.numQueue(), 'nextup': self.currentqn})
        self.log.info("Number in Queue: {}".format(self.d.numQueue()))
        return queue_number


    @wamp.register(u'com.emfpulse.queue.status')
    def getQueueStatus(self):
        return {'queue_total': self.d.numQueue(), 'nextup': self.currentqn}

    @wamp.register(u'com.emfpulse.queue.next')
    def getNextInQueue(self):
        qn = self.d.getNextInQueue()
        self.currentqn = qn
        self.log.info("Next up: {}".format(qn))
        self.publish('com.emfpulse.queue', {'queue_total': self.d.numQueue(), 'nextup': qn})
        return qn

    @wamp.register(u'com.emfpulse.queue.getnextinfo')
    def getNextPlayerInfo(self, qn):
        self.current = self.d.getQueuePlayer(qn)
        self.log.info("Now Playing: {} {}, {} - {}".format(qn, self.current['player'], self.current['artist'], self.current['song']))
        self.publish('com.emfpulse.current', self.current)
        return self.current

    @wamp.register(u'com.emfpulse.queue.getinfo')
    def getPlayerInfo(self, qn):
        info = self.d.getQueuePlayer(qn)
        return {'player_name': info['player'], 'song': {'name': info['song'], 'artist': info['artist']}};

    @wamp.register(u'com.emfpulse.playstatus.get')
    def getCurrentlyPlaying(self):
        return self.current

    @wamp.register(u'com.emfpulse.play.endgame')
    def endOfGame(self, score):
        self.d.addScore(self.currentqn, score, self.current['song'], self.current['artist'])
        
        songldrbrd = self.d.getLeaderboard(10, self.current['song'], self.current['artist'])
        allldrbrd = self.d.getLeaderboard(10)
        self.publish('com.emfpulse.leaderboards.update', {'song': None, 'artist': None, 'leaderboard': allldrbrd})
        self.publish('com.emfpulse.leaderboards.update', {'song': self.current['song'], 'artist': self.current['artist'], 'leaderboard': songldrbrd})
        
        if getLeaderboardPosition(self.current['name']) == 0:
            self.t.update_status(status='{} has set a new overall highscore of {} #emfcamp'.format(self.current['name'], score))
        if getLeaderboardPosition(self.current['name'], song=self.current['song'], artist=self.current['artist']) == 0:
            self.t.update_status(status='{} has set a new highscore of {} for {} - {} #emfcamp'.format(self.current['name'], score, self.current['artist'], self.current['song']))



    @wamp.register(u'com.emfpulse.playstatus.set')
    def setPlayStatus(self, status, song_name=None, song_artist=None):
        self.current['isplaying'] = status
        self.publish('com.emfpulse.current', self.current)

    @wamp.register(u'com.emfpulse.enabled.get')
    def getEnabled(self):
        return self.enabled

    @wamp.register(u'com.emfpulse.enabled.set')
    def setEnabled(self, pwd):
        if pwd == s.ADMIN_PASSWORD:
            self.enabled = not self.enabled
            self.publish('com.emfpulse.enabled.status', self.enabled)
            self.log.info("Enabled: {}".format(self.enabled))
    
    @wamp.register(u'com.emfpulse.queue.clear')
    def clearQueue(self, pwd):
        if pwd == s.ADMIN_PASSWORD:
            self.d.clearQueue()
            self.currentqn = int(self.d.queueCount())
            self.publish('com.emfpulse.queue', {'queue_total': self.d.numQueue(), 'nextup': self.currentqn})
            self.log.info("Queue cleared")

    @wamp.register(u'com.emfpulse.leaderboards.clear')
    def clearLeaderboards(self, pwd):
        if pwd == s.ADMIN_PASSWORD:
            self.d.clearLeaderboards()
            self.publish('com.emfpulse.leaderboards.update', {'song': None, 'artist': None, 'leaderboard': []})
            self.log.info("Leaderboards cleared")
    

    @inlineCallbacks
    def onJoin(self, details):
        res = yield self.register(self)
        
        res2 = yield self.subscribe(self)

        self.log.info("{} procedures registered.".format(len(res)))
