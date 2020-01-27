function generateBlock(block_content) {
    if (block_content!=null){
        var denom = 0;
        for (var i = 0; i < block_content.length; i++){
            denom += parseInt(block_content[i].prob_score);
        }
        var peg = denom * Math.random();
        var counter = 0;
        for (var i = 0; i < block_content.length; i++){
            counter += parseInt(block_content[i].prob_score);
            if (counter>=peg){
                return block_content[i].name;
            }
        }
    }
    return "n/a";
}

function generateReport(report_params, block_content) {
    var result = [];
    for (var i = 0; i < report_params.length; i++){
        if (report_params[i].unique_results=='y'){
            var dummy_content = JSON.parse(JSON.stringify(block_content));
            var curr = "";
            for (var j = 0; j < report_params[i].quantity; j++){
                curr = generateBlock(dummy_content[report_params[i].cb_id]);
                for (var k = 0; k < dummy_content[report_params[i].cb_id].length; k++){
                    if (dummy_content[report_params[i].cb_id][k].name==curr){
                        dummy_content[report_params[i].cb_id].splice(k, 1);
                        break;
                    }
                }
                result.push(curr);
                curr = "";
            }
        }
        else {
            for (var j = 0; j < report_params[i].quantity; j++){
                result.push(generateBlock(block_content[report_params[i].cb_id]));
            }
        }
    }
    return result;
}