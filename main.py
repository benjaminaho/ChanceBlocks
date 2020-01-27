from application import database, db_handler
from flask import Blueprint, render_template, Response, url_for, request
from flask_login import login_required, current_user
from user import User
import json, functools

main = Blueprint('main', __name__)


# render index page
@main.route('/', methods=['GET'])
def index():
    return render_template('index.html')


# render about page
@main.route('/about', methods=['GET'])
def about():
    return render_template('about.html')


# render blocks page; handles all requests from blocks page except get block content (handled by stream_block_content)
@main.route('/blocks', methods=['GET', 'PUT', 'PATCH', 'DELETE'])
@login_required
@db_handler("block")
def blocks():

    if request.method == 'PUT':
        message = request.get_json()

        # if message contains a single element for block name, then new block is created
        if (len(message)==1):
            x = database.add(current_user.id, message[0])
            if x > 0:
                return Response(status=201)
            return Response(status=500)

        # if message contains cb_id and block name, then block with key cb_id is updated
        else:
            database.update("title", message[1], message[0])
            return Response(status=204)

    # update block contents
    if request.method == 'PATCH':
        updated_content_info = request.get_json()
        database.update("content", json.dumps(updated_content_info[1]), updated_content_info[0])
        return Response(status=204)

    # delete block
    if request.method == 'DELETE':
        cb_id_tbd = request.get_json()[0]
        database.remove(cb_id_tbd, current_user.id)
        return Response(status=204)
    
    # method = GET
    blocks = database.get("primary content", current_user.id)
    return render_template('blocks.html', blocks=blocks, user_id=current_user.id)


# get content of single block from db and return it to client
@main.route('/stream_block_content/cb/<cb_id>')
@login_required
@db_handler("block")
def stream_block_content(cb_id):
    content = database.get("secondary content", cb_id)[0]
    if content == None:
        return Response('["No content"]', mimetype='text/html')
    return Response(content, mimetype='text/html')


# get contents of all block associated with report from db and return them to client
@main.route('/stream_block_content/report/<report_id>')
@login_required
@db_handler("report")
def stream_block_contents_of_report(report_id):
    raw_contents = database.get("tertiary content", report_id)
    contents = []
    for tup in raw_contents:
        contents.append([tup[0], tup[1]])
    if contents == None:
        return Response('["No content"]', mimetype='text/html')
    return Response(json.dumps(contents), mimetype='text/html')


# render reports page; handles all requests from reports page except get report content (handled by stream_report_content) and get block contents (handled by stream_block_contents_of_report)
@main.route('/reports', methods=['GET', 'PUT', 'PATCH', 'DELETE'])
@login_required
@db_handler("report")
def reports():

    if request.method == 'PUT':
        message = request.get_json()

        # if message contains a single element for report name, then new report is created
        if (len(message)==1):
            x = database.add(current_user.id, message[0])
            if x > 0:
                return Response(status=201)
            return Response(status=500)

        # if message contains report_id and report name, then report with key report_id is updated
        else:
            database.update("title", message[1], message[0])
            return Response(status=204)

    # update report contents
    if request.method == 'PATCH':
        updated_info = request.get_json()
        database.update("content", updated_info[0], updated_info[1])
        return Response(status=204)

    # delete report
    if request.method == 'DELETE':
        report_id_tbd = request.get_json()[0]
        database.remove(report_id_tbd, current_user.id)
        return Response(status=204)

    # method = GET
    reports = database.get("primary content", current_user.id)
    database.kind = "block"
    blocks = json.dumps(database.get("primary content", current_user.id))
    database.kind = "report"
    return render_template('reports.html', reports=reports, blocks=blocks, user_id=current_user.id)


# get content of report (not contents of the blocks indicated therein) from db and return it to client
@main.route('/stream_report_content/<report_id>')
@login_required
@db_handler("report")
def stream_report_content(report_id):
    raw_content = database.get("secondary content", report_id)
    content = []
    for tup in raw_content:
        content.append({"cb_id": tup[0], "quantity": tup[1], "unique_results": tup[2]})
    if content == None:
        return Response(status=404)
    return Response(json.dumps(content), mimetype='text/html')


@main.route('/.well-known/acme-challenge/<challenge>')
def letsencrypt_check(challenge):
    challenge_response = {
        "aDWfAHSTkNkjozpb25LJyFKcjswggqlqgMW0Nky7sw8":"aDWfAHSTkNkjozpb25LJyFKcjswggqlqgMW0Nky7sw8.9xjpujvz7-vvd2mQpsKCHg_RbnhN-jNWv93mRfF6IvI",
        "CjVhK4sKZTIXfl72D5zDuf3VrTZi1waqR2GKyDfM2ko":"CjVhK4sKZTIXfl72D5zDuf3VrTZi1waqR2GKyDfM2ko.9xjpujvz7-vvd2mQpsKCHg_RbnhN-jNWv93mRfF6IvI"
    }
    return Response(challenge_response[challenge], mimetype='text/plain')
