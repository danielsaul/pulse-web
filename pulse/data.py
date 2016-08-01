from redis import StrictRedis
from redis.exceptions import ConnectionError

class PulseData():

    def __init__(self, redis):
        self.r = redis

        self.r.setnx('song:count',0)

    def addSong(self, name, artist, length):
        n = self.r.get('song:count')
        return
