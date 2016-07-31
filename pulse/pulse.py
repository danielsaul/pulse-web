##############################################################################
# Pulse Backend
# Stores data in redis and uses Crossbar to act as a conduit between the
# pulse hardware and web frontend
###############################################################################

from twisted.internet.defer import inlineCallbacks
from twisted.logger import Logger

from autobahn.twisted.util import sleep
from autobahn.twisted.wamp import ApplicationSession
from autobahn.wamp.exception import ApplicationError


class PulseBackend(ApplicationSession):

    log = Logger()

    def __init__(self, config):
        ApplicationSession.__init__(self, config)
        self.init()

    def init(self):
        return

    @inlineCallbacks
    def onJoin(self, details):
        res = yield self.register(self)
        self.log.info("{} procedures registered.".format(len(res))
