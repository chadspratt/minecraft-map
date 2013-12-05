<?php
// get_maps()
// get_subcategories($category)
include "queryWiki.php";
// get_json_from_sql($category)
include "queryDB.php";

// work with either post or
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET["action"];
    $category = $_GET["category"];
}
else {
    $action = $_POST["action"];
    $category = $_POST["category"];
}

if ($action == "get") {
    $result = get_json_from_sql($category);
    echo $result;
}
else if ($action == "update") {
    $maps_json = get_maps();
    add_json_to_sql("maps", $maps_json);
    // for debugging
    echo $maps_json;
}
?>
