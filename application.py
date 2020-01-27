from flask import Flask
from flask_login import LoginManager
import os, functools

# create application
application = Flask(__name__)
application.secret_key = os.urandom(24)


# create and configure LoginManager object
login_manager = LoginManager()
login_manager.login_view = 'auth.login'
login_manager.init_app(application)

from user import User
from procedures import Query

# instantiate Query object for database connection
database = Query()

# decorator opens and closes MySQLdb cursor around decorated function
def db_handler(kind):
    def w(f):
        @functools.wraps(f)
        def x(*args, **kwargs):
            database.kind = kind
            database.cursor = database.connection.cursor()
            val = f(*args, **kwargs)
            database.cursor.close()
            return val
        return x
    return w

@login_manager.user_loader
@db_handler("user")
def load_user(user_id):
    user_info = database.get("internal", user_id)
    return User(user_id, user_info[0], user_info[1])


# register blueprints
from main import main
application.register_blueprint(main, url_prefix='/')

from auth import auth
application.register_blueprint(auth, url_prefix='/auth')


# run application
if __name__ == '__main__':
    application.threaded=True
    application.run()
