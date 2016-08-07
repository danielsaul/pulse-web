from redis import StrictRedis
from redis.exceptions import ConnectionError

class PulseData():

    def __init__(self, redis):
        self.r = redis
        
        self.r.setnx('queue:count',100)


    def addSong(self, name, artist):
        self.r.sadd('songs:all','{}:{}'.format(name,artist))
   
    def clearSongs(self):
        self.r.delete('songs:all')

    def getSongs(self, asdict=True):
        songlist = self.r.smembers('songs:all')
        if not asdict:
            return songlist
        songs = [{'name':song.split(':')[0],'artist':song.split(':')[1]} for song in songlist ]
        return songs

    def numSongs(self):
        return self.r.scard('songs:all')

    def getLeaderboard(self,n,song=None,artist=None):
    
        if song is None and artist is None:
            key = 'leaderboards:all'
        else:
            key = 'leaderboards:{}:{}'.format(song,artist)

        scores = self.r.zrevrange(key, 0, n, withscores=True)
        leaderboard = [{'n': i+1, 'player': score[0], 'score': score[1]} for i,score in enumerate(scores)]
        return leaderboard

    def clearLeaderboards(self):
        songs = self.getSongs(asdict=False)
        for x in songs:
            self.r.delete('leaderboards:{}'.format(x))
        self.r.delete('leaderboards:all')

    def addPlayer(self, name, song, artist):
        if self.r.zscore('leaderboards:all', name) is None:
            self.r.zadd('leaderboards:all', 0, name)

        qn = self.r.incr('queue:count')
        self.r.lpush('queue', qn)
        
        self.r.hmset('queue:{}'.format(str(qn)), {'player': name, 'song': song, 'artist': artist})

        return qn

    def getNextInQueue(self):
        return self.r.rpop('queue')
        
    def getQueuePlayer(self, qn):
        return self.r.hgetall('queue:{}'.format(str(qn)))

    def numQueue(self):
        return self.r.llen('queue')

    def queueCount(self):
        return self.r.get('queue:count')

    def clearQueue(self):
        self.r.delete('queue')

    def addScore(self, qn, score, song, artist):
        player = self.getQueuePlayer(qn)
        self.r.zadd('leaderboards:all', score, player['player'])
        self.r.zadd('leaderboards:{}:{}'.format(song,artist), score, player['player'])
        self.r.delete('queue:{}'.format(qn))

    def getLeaderboardPosition(self, player, song=None, artist=None):
        if song is None and artist is None:
            key = 'leaderboards:all'
        else:
            key = 'leaderboards:{}:{}'.format(song,artist)

        return self.r.zrevrank(key, player)
        
        



    

    
