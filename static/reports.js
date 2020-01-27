const user_id = document.getElementsByName('user_id')[0].getAttribute('content');
const blocks = JSON.parse(document.getElementsByName('blocks')[0].getAttribute('content'));

var loaded_report_content = {};
var loaded_block_content = {};
var unsaved_reports = [];

const SHOW_EDITOR = 0;
const GENERATE = 1;

function toggleEditor(report_id) {
    if (document.getElementById("editor_" + report_id).hasAttribute("hidden")){
        document.getElementById("editor_" + report_id).removeAttribute("hidden");
        document.getElementById("editor_toggle_" + report_id).innerHTML = "Hide Contents";
        getContent(report_id, SHOW_EDITOR);
    }
    else {
        document.getElementById("editor_toggle_" + report_id).innerHTML = "Show Contents";
        document.getElementById("editor_" + report_id).setAttribute("hidden", "");
    }
}

function getContent(report_id, purpose) {

    if(!loaded_report_content.hasOwnProperty(report_id)){
        var reports_request = new XMLHttpRequest();
        reports_request.open("GET", "/stream_report_content/" + report_id);
        reports_request.send();
        reports_request.onreadystatechange = function() {
            if (this.readyState==XMLHttpRequest.DONE){
                content = JSON.parse(reports_request.responseText);
                if (content[0]!="No content"){
                    Object.assign(loaded_report_content, {[report_id]: content});
                }
                else {
                    Object.assign(loaded_report_content, {[report_id]: []});
                }
                var blocks_request = new XMLHttpRequest();
                blocks_request.open("GET", "/stream_block_content/report/" + report_id);
                blocks_request.send();
                blocks_request.onreadystatechange = function() {
                    if (this.readyState==XMLHttpRequest.DONE && this.status==200){
                        var contents = JSON.parse(blocks_request.responseText);
                        for (var i = 0; i < contents.length; i++){
                            if (!loaded_block_content.hasOwnProperty(contents[i][0])){
                                Object.assign(loaded_block_content, {[contents[i][0]]: JSON.parse(contents[i][1])});
                            }
                        }
                        if (purpose==SHOW_EDITOR){
                            showEditor();
                        }
                        else if (purpose==GENERATE){
                            generate(report_id);
                        }
                    }
                }
            }
        }
    }
    else if (purpose==SHOW_EDITOR){
        showEditor();
    }
    else if (purpose==GENERATE){
        generate(report_id);
    }

    function showEditor() {

        if (loaded_report_content[report_id].length == 0) {
            var editor_html = "<p>No blocks in this report yet.</p>\n<select id='" + report_id + "_select' onchange='addBlock(" + report_id + ")'>\n<option disabled selected>Select Chance Block</option>\n";
            for (i in Object.keys(blocks)){
                editor_html += ("<option value='" + Object.keys(blocks)[i] + "'>" + blocks[Object.keys(blocks)[i]] + "</option>\n");
            }
            editor_html += "</select>\n";
            document.getElementById('editor_' + report_id).innerHTML = editor_html;
        }
        else {
            var editor_html = "<ul style='list-style-type:none;'>\n" + contentToHTML() + "</ul>\n<select class='inline vertical-align' id='" + report_id + "_select' onchange='addBlock(" + report_id + ")'>\n<option disabled selected>Select Chance Block</option>\n";
            var report_cb_ids = [];
            var k = loaded_report_content[report_id].length;
            for (var l = 0; l < k; l++){
                report_cb_ids[l] = loaded_report_content[report_id][l].cb_id;
            }
            var has_cb = false;
            for (var i in Object.keys(blocks)){
                for (var j in report_cb_ids){
                    if (Object.keys(blocks)[i] == report_cb_ids[j]) {
                        has_cb = true;
                        break;
                    }
                }
                if (!has_cb){
                    editor_html += ("<option value='" + Object.keys(blocks)[i] + "'>" + blocks[Object.keys(blocks)[i]] + "</option>\n");
                }
                has_cb = false;
            }
            editor_html += ("</select>\n<a class='button is-small inline vertical-align' onclick='saveReport(" + report_id + ")'>Save</a>\n");
            document.getElementById('editor_' + report_id).innerHTML = editor_html;
        }
            
        function contentToHTML() {
            var result = "";
            for (var i = 0; i < loaded_report_content[report_id].length; i++){
                cb_id = loaded_report_content[report_id][i].cb_id;
                result +=
                    "<li class='columns'>\n" +
                    "   <div class='column is-one-quarter'><h3>" + blocks[cb_id] + ":</h3></div>\n" +
                    "   <div class='column'>" +
                    "       <p class='inline vertical-align'>Quantity:</p><input class='inline vertical-align' type='number' id='" + report_id + "_" + cb_id + "_quantity' onchange='updateQuantity(" + report_id + ", " + cb_id + ")' value='" + loaded_report_content[report_id][i].quantity + "'>\n" +
                    "       <p class='inline vertical-align'>Disallow Duplicates:</p><input class='inline vertical-align' type='checkbox' id='" + report_id + "_" + cb_id + "_unique' oninput='updateUnique(" + report_id + ", " + cb_id + ")'";
                if (loaded_report_content[report_id][i].unique_results=='y'){
                    result += " checked";
                }
                result += ">\n<button class='delete is-small inline vertical-align' onclick='removeBlock(" + report_id + ", " + cb_id + ")'>\n</div>\n</li>\n";
            }
            return result;
        }
    }
}

function createReportPrompt() {
    document.getElementById('new_report').innerHTML = (
        "<input class='inline vertical-align' type='text' id='new_report_name' value='New Report Name'>\n" +
        "<a class='button is-small inline vertical-align' onclick='createReport()'>OK</a>\n"
    );
}

function createReport() {

    var name = document.getElementById('new_report_name').value;

    var request = new XMLHttpRequest();
    request.open("PUT", "/reports");
    request.setRequestHeader("Content-Type", "application/json");
    request.send(JSON.stringify([name]));

    request.onreadystatechange = function() {
        if (this.readyState==XMLHttpRequest.DONE && this.status==201){
            document.location.reload();
        }
    }

}

function saveReport(report_id) {

    var request = new XMLHttpRequest();
    request.open("PATCH", "/reports");
    request.setRequestHeader("Content-Type", "application/json");
    request.send(JSON.stringify([report_id, loaded_report_content[report_id]]));

    request.onreadystatechange = function() {
        if (this.readyState==XMLHttpRequest.DONE && this.status==204){
            setSavedState(report_id, true);
        }
    }

}

function deleteReport(report_id, report_title) {

    var b = confirm("Are you sure you want to delete " + report_title + "?\nYou can't undo this action.");

    if (b){
        var request = new XMLHttpRequest();
        request.open("DELETE", "/reports");
        request.setRequestHeader("Content-Type", "application/json");
        request.send(JSON.stringify([report_id]));
        request.onreadystatechange = function() {
            if (this.readyState==XMLHttpRequest.DONE && this.status==204){
                document.location.reload();
            }
        }
    }

}

function addBlock(report_id) {
    var cb_id = document.getElementById(report_id + "_select").value;
    loaded_report_content[report_id].push({"cb_id": cb_id, "quantity": 1, "unique_results": "n"});
    setSavedState(report_id, false);
    getContent(report_id, SHOW_EDITOR);
}

function updateQuantity(report_id, cb_id) {
    for (var i = 0; i< loaded_report_content[report_id].length; i++){
        if (loaded_report_content[report_id][i].cb_id==cb_id){
            loaded_report_content[report_id][i].quantity = document.getElementById(report_id + "_" + cb_id + "_quantity").value;
            break;
        }
    }
    setSavedState(report_id, false);
}

function updateUnique(report_id, cb_id) {
    for (var i = 0; i < loaded_report_content[report_id].length; i++){
        if (loaded_report_content[report_id][i].cb_id==cb_id){
            if (loaded_report_content[report_id][i].unique_results=='y'){
                loaded_report_content[report_id][i].unique_results = 'n';
            }
            else {
                loaded_report_content[report_id][i].unique_results = 'y';
            }
            break;
        }
    }
    setSavedState(report_id, false);
}

function removeBlock(report_id, cb_id) {
    for (var i = 0; i < loaded_report_content[report_id].length; i++){
        if (loaded_report_content[report_id][i].cb_id==cb_id){
            loaded_report_content[report_id].splice(i, 1);
        }
    }
    setSavedState(report_id, false); 
    getContent(report_id, SHOW_EDITOR);
}

function changeReportTitlePrompt(report_id, report_title) {
    document.getElementById(report_id + '_title').innerHTML = (
        "<input class='inline vertical-align' type='text' id='" + report_id + "_title_edit' value='" + report_title + "'>\n" +
        "<a class='button is-small inline vertical-align' onclick='changeReportTitle(" + report_id + ", \"" + report_title + "\")'>Set Report Name</a>\n"
    );
}

function changeReportTitle(report_id, old_title) {
    var new_title = document.getElementById(report_id + "_title_edit").value;
    if (new_title==old_title){
        resetTitle();
    }
    else {
        var b = true;
        if (unsaved_reports.length>0){
            var b = confirm("This action will delete unsaved changes. Would you like to proceed?");
        }
        if (!b) {
            resetTitle();
            return;
        }
        var request = new XMLHttpRequest();
        request.open("PUT", "/reports");
        request.setRequestHeader("Content-Type", "application/json");
        request.send(JSON.stringify([report_id, new_title]));
        request.onreadystatechange = function() {
            if (this.readyState==XMLHttpRequest.DONE && this.status==204){
                document.location.reload();
            }
        }
    }

    function resetTitle() {
        var result = "<h3 class='inline title is-size-4' onclick='changeReportTitlePrompt(" + report_id + ", \"" + old_title + "\")'>" + old_title + "</h3><h3 id='" + report_id + "_unsaved'>";
        if (unsaved_reports.includes(report_id)){
            result += "*";
        }
        result += "</h3>";
        document.getElementById(report_id + '_title').innerHTML = result;
    }
}

function setSavedState(report_id, saved) {
    if (saved && unsaved_reports.includes(report_id)) {
        unsaved_reports.splice(unsaved_reports.indexOf(report_id), 1);
        document.getElementById(report_id + "_unsaved").innerHTML = "";
    }
    else if (!saved && !unsaved_reports.includes(report_id)){
        unsaved_reports.push(report_id);
        document.getElementById(report_id + "_unsaved").innerHTML = "*";
    }
}

function generate(report_id) {
    result_arr = generateReport(loaded_report_content[report_id], loaded_block_content);
    result_html = "";
    for (var i in result_arr){
        result_html += "<p>" + result_arr[i] + "</p>\n";
    }
    document.getElementById(report_id + "_output").innerHTML = result_html;
}