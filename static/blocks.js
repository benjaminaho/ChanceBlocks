user_id = document.getElementsByName('user_id')[0].getAttribute('content');

var loaded_content = {};
var unsaved_blocks = [];

const SHOW_EDITOR = 0;
const GENERATE = 1;

function toggleEditor(cb_id) {
    if (document.getElementById("editor_" + cb_id).hasAttribute("hidden")){
        document.getElementById("editor_" + cb_id).removeAttribute("hidden");
        document.getElementById("editor_toggle_" + cb_id).innerHTML = "Hide Contents";
        getContent(cb_id, SHOW_EDITOR);
    }
    else {
        document.getElementById("editor_toggle_" + cb_id).innerHTML = "Show Contents";
        document.getElementById("editor_" + cb_id).setAttribute("hidden", "");
    }
}

function getContent(cb_id, purpose) {
    
    if (!loaded_content.hasOwnProperty(cb_id)){
        var request = new XMLHttpRequest();
        request.open("GET", "/stream_block_content/cb/" + cb_id);
        request.send();
        request.onreadystatechange = function() {
            if (this.readyState==XMLHttpRequest.DONE && this.status==200){
                content = JSON.parse(request.responseText);
                if (content[0]!="No content"){
                    Object.assign(loaded_content, {[cb_id]: content});
                }
                else {
                    Object.assign(loaded_content, {[cb_id]: []});
                }
                if (purpose==SHOW_EDITOR){
                    showEditor();
                }
                else if (purpose==GENERATE){
                    generate(cb_id);
                }
            }
        }
    }
    else if (purpose==SHOW_EDITOR){
        showEditor();
    }
    else if (purpose==GENERATE){
        generate(cb_id);
    }

    function showEditor() {
        if (loaded_content[cb_id].length == 0) {
            document.getElementById('editor_' + cb_id).innerHTML = (
                "<p>No items in this block yet.</p>\n" +
                "<a class='button is-small' onclick='createItem(" + cb_id + ")'>New Item</a>\n"  
            );
        }
        else {
            document.getElementById('editor_' + cb_id).innerHTML = (
                "<ul style='list-style-type:none;'>\n" + contentToHTML(cb_id) + "</ul>\n" +
                "<a class='button is-small' onclick='createItem(" + cb_id + ")'>New Item</a>\n" +
                //"<input type='button' id='" + cb_id + "_restore' value='Restore'></input>\n" +
                "<a class='button is-small' onclick='saveBlock(" + cb_id + ")'>Save</a>\n"
            );
        }

        function contentToHTML(cb_id) {
            result = "";
            for (var i = 0; i < loaded_content[cb_id].length; i++){
                result += (
                    "<li>\n" + 
                    "   <input class='inline vertical-align' type='range' onchange='updateScore(" + cb_id + ", " + i + ")' value='" + loaded_content[cb_id][i].prob_score + "' id='" + cb_id + "_" + i + "_scrub'>\n" +
                    "   <div class='inline vertical-align' id='" + cb_id + "_" + i + "_name_box'>\n" +
                    "       <h3 onclick='editItemPrompt(" + cb_id + ", " + i + ")'>" + loaded_content[cb_id][i].name + "</h3>\n" +
                    "   </div>\n" +
                    "   <button class='delete is-small inline' onclick='deleteItem(" + cb_id + ", " + i + ")'>\n" +
                    "</li>\n"
                );
            }
            return result;
        }
    }

}

function createBlockPrompt() {
    document.getElementById('new_block').innerHTML = 
        "<input class='inline vertical-align' type='text' id='new_block_name' value='New Block Name'>\n" +
        "<a class='button inline vertical-align' onclick='createBlock()'>OK</a>\n";
}

function createBlock() {

    var name = document.getElementById('new_block_name').value;
    var message = JSON.stringify([name]);

    var request = new XMLHttpRequest();
    request.open("PUT", "/blocks");
    request.setRequestHeader("Content-Type", "application/json");
    request.send(message);

    request.onreadystatechange = function() {
        if (this.readyState==XMLHttpRequest.DONE && this.status==201){
            document.location.reload();
        }
    }

}

function saveBlock(cb_id) {

    var request = new XMLHttpRequest();
    request.open("PATCH", "/blocks");
    request.setRequestHeader("Content-Type", "application/json");
    request.send(JSON.stringify([cb_id, loaded_content[cb_id]]));

    request.onreadystatechange = function() {
        if (this.readyState==XMLHttpRequest.DONE && this.status==204){
            setSavedState(cb_id, true);
        }
    }

}

function deleteBlock(cb_id, cb_title) {

    var b = confirm("Are you sure you want to delete " + cb_title + "?\nYou can't undo this action.");

    if (b){
        var request = new XMLHttpRequest();
        request.open("DELETE", "/blocks");
        request.setRequestHeader("Content-Type", "application/json");
        request.send(JSON.stringify([cb_id]));
        request.onreadystatechange = function() {
            if (this.readyState==XMLHttpRequest.DONE && this.status==204){
                document.location.reload();
            }
        }
    }

}

function createItem(cb_id) {
    loaded_content[cb_id].push({name: "New Item", prob_score: 50});
    setSavedState(cb_id, false);
    getContent(cb_id, SHOW_EDITOR);
}

function editItemPrompt(cb_id, item_idx) {
    document.getElementById(cb_id + "_" + item_idx + "_name_box").innerHTML = (
        "<input class='inline' type='text' id='" + cb_id + "_" + item_idx + "_name' value='" + loaded_content[cb_id][item_idx].name + "'>\n" +
        "<a class='button is-small inline' onclick='editItem(" + cb_id + ", " + item_idx + ")'>OK</a>\n"
    );
}

function editItem(cb_id, item_idx) {
    var new_name = document.getElementById(cb_id + "_" + item_idx + "_name").value;
    if (loaded_content[cb_id][item_idx].name!=new_name){
        setSavedState(cb_id, false);
    }
    loaded_content[cb_id][item_idx].name = new_name
    getContent(cb_id, SHOW_EDITOR);
}

function updateScore(cb_id, item_idx){
    loaded_content[cb_id][item_idx].prob_score = document.getElementById(cb_id + "_" + item_idx + "_scrub").value;
    setSavedState(cb_id, false);
}

function deleteItem(cb_id, item_idx) {
    loaded_content[cb_id].splice(item_idx, 1);
    setSavedState(cb_id, false);
    getContent(cb_id, SHOW_EDITOR);
}

function setSavedState(cb_id, saved) {
    if (saved && unsaved_blocks.includes(cb_id)) {
        unsaved_blocks.splice(unsaved_blocks.indexOf(cb_id), 1);
        document.getElementById(cb_id + "_unsaved").innerHTML = "";
    }
    else if (!saved && !unsaved_blocks.includes(cb_id)){
        unsaved_blocks.push(cb_id);
        document.getElementById(cb_id + "_unsaved").innerHTML = "*";
    }
}

function changeBlockTitlePrompt(cb_id, cb_title) {
    document.getElementById(cb_id + '_title').innerHTML = (
        "<input class='inline' type='text' id='" + cb_id + "_title_edit' value='" + cb_title + "'>\n" +
        "<a class='button is-small inline' onclick='changeBlockTitle(" + cb_id + ", \"" + cb_title + "\")'>Set Block Name</a>\n"
    );
}

function changeBlockTitle(cb_id, old_title) {
    var new_title = document.getElementById(cb_id + "_title_edit").value;
    if (new_title==old_title){
        resetTitle();
    }
    else {
        var b = true;
        if (unsaved_blocks.length>0){
            var b = confirm("This action will delete unsaved changes. Would you like to proceed?");
        }
        if (!b) {
            resetTitle();
            return;
        }
        var request = new XMLHttpRequest();
        request.open("PUT", "/blocks");
        request.setRequestHeader("Content-Type", "application/json");
        request.send(JSON.stringify([cb_id, new_title]));
        request.onreadystatechange = function() {
            if (this.readyState==XMLHttpRequest.DONE && this.status==204){
                document.location.reload();
            }
        }
    }

    function resetTitle() {
        var result = "<h3 class='inline title is-size-4' onclick='changeBlockTitlePrompt(" + cb_id + ", \"" + old_title + "\")'>" + old_title + "</h3><h3 class='inline title is-size-4' id='" + cb_id + "_unsaved'>";
        if (unsaved_blocks.includes(cb_id)){
            result += "*";
        }
        result += "</h3>";
        document.getElementById(cb_id + '_title').innerHTML = result;
    }

}

function generate(cb_id) {
    document.getElementById(cb_id + "_output").innerHTML = generateBlock(loaded_content[cb_id]);
}
