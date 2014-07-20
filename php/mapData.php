<?php
// get_data_json()
include "queryWiki.php";
// add_json_to_sql($json_string)
// get_json_from_sql($category)
include "queryDB.php";

// work with either post or get
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET["action"];
}
else {
    $action = $_POST["action"];
}

if ($action == "get") {
    echo get_json_from_sql("alldata");
}
else if ($action == "update") {
    // get refreshed data from the wiki
    $data_json = get_data_json("H-verse");
    // cache it in the database
    add_json_to_sql("alldata", $data_json);
    echo $data_json;
}
?>
