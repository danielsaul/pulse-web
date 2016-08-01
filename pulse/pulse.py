##############################################################################
# Pulse Backend
# Stores data in redis and uses Crossbar to act as a conduit between the
# pulse hardware and web frontend
###############################################################################

import sys

from twisted.internet.defer import inlineCallbacks
from twisted.logger import Logger

from autobahn.twisted.util import sleep
from autobahn.twisted.wamp import ApplicationSession
from autobahn.wamp.exception import ApplicationError

from redis import StrictRedis
from redis.exceptions import ConnectionError

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
        return

    

    @inlineCallbacks
    def onJoin(self, details):
        res = yield self.register(self)
        self.log.info("{} procedures registered.".format(len(res)))
