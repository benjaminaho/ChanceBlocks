from application import database, db_handler
from flask import Blueprint, render_template, url_for, request, flash, redirect
from flask_login import login_user, logout_user, login_required
from werkzeug.security import generate_password_hash, check_password_hash
from user import User
import functools

auth = Blueprint('auth', __name__)


@auth.route('login', methods=['GET'])
def login_page():
    return render_template('login.html')


@auth.route('/login', methods=['POST'])
@db_handler("user")
def login():

    # obtain login information
    username = request.form.get('username')
    password = request.form.get('password')
    remember = True if request.form.get('remember') else False

    # attempt to get existing user with provided username
    user_info = database.get("external", username)

    # verify user exists and has entered the correct password
    if user_info is None or not check_password_hash(user_info[1].decode('utf-8'), password):
        flash('The username or password is incorrect.')
        return redirect(url_for('auth.login'))

    # create User object from queried information and login user
    user = User(user_info[0], username, user_info[1])
    login_user(user, remember=remember)

    return redirect(url_for('main.blocks'))


@auth.route('signup', methods=['GET'])
def signup_page():
    return render_template('signup.html')


@auth.route('/signup', methods=['POST'])
@db_handler("user")
def signup():

    # obtain signup information
    username = request.form.get('username')
    password = request.form.get('password')
    password_verify = request.form.get('password_verify')

    # attempt to get existing user with provided username
    user_info = database.get("user", username)

    # verify user does not already have username
    if user_info is not None:
        flash('An account with this username already exists.')
        return redirect(url_for('auth.signup'))

    # verify provided passwords match
    if password != password_verify:
        flash('The passwords do not match.')
        return redirect(url_for('auth.signup'))

    # upon successful creation of user, redirect to login
    x = database.add(username, generate_password_hash(password, method='sha256'))
    if x > 0:
        return redirect(url_for('auth.login'))


@auth.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('main.index'))
