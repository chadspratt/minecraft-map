<?php
// get_db connection()
include "/home/dogtaton/db_connect/mcmap.inc";

function encode_query($raw_query) {
    $encoded_query = $raw_query;
    // replace '[' with '-5B'
    $encoded_query = str_replace("[", "-5B", $encoded_query);
    // replace "]" with "-5D"
    $encoded_query = str_replace("]", "-5D", $encoded_query);
    // replace "?" with "-3F"
    $encoded_query = str_replace("?", "-3F", $encoded_query);
    // replace spaces with "-20"
    $encoded_query = str_replace(" ", "-20", $encoded_query);
    // replace "=" with "-3D"
    $encoded_query = str_replace("=", "-3D", $encoded_query);
    // replace newlines with "/"
    $encoded_query = str_replace("\n", "/", $encoded_query);
    return $encoded_query;
}

function query_wiki($query_array) {
    $ch = curl_init("http://dogtato.net/minecraft/index.php");
    curl_setopt($ch, CURLOPT_POST, TRUE);
    curl_setopt($ch, CURLOPT_HEADER, FALSE);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
    $post_data = "title=Special:Ask/";
    $query = implode("\n", $query_array);
    $post_data .= encode_query($query);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);
    // $result = "$post_data";
    return curl_exec($ch);

}
if ($_GET["action"] == "get" or $_POST["action"] == "get") {
    if ($_GET["category"] == "maps" or $_POST["category"] == "maps") {
        $mysqli = get_db_connection();
        $result = $mysqli->query("SELECT f1.Data FROM features_json f1 " . 
                                 "LEFT JOIN features_json f2 " .
                                 "ON f1.Date < f2.Date " .
                                 "WHERE f2.Date is null");
        $row = $result->fetch_row();
        echo $row[0];
    }
    else {
        $map_query = array("[[Category:{$_GET["category"]}]]",
                           "?x coord",
                           "?z coord",
                           "?image location",
                           "format=json",
                           "searchlabel=JSON output",
                           "prettyprint=yes",
                           "offset=0");
        $result = query_wiki($map_query);
        echo $result;

    }
}
else if ($_GET["action"] == "update") {
    $wiki_query = array("[[Category:Maps]]",
                       "?x coord",
                       "?z coord",
                       "?image location",
                       "format=json",
                       "searchlabel=JSON output",
                       "prettyprint=yes",
                       "offset=0");
    $mysqli = get_db_connection();
    $result = query_wiki($wiki_query);
    $escaped_result = $mysqli->real_escape_string($result);
    $sql_query = "INSERT INTO features_json (Category, Data) " . 
                 "VALUES('Maps', '$escaped_result')";
    $res = $mysqli->query($sql_query);
    var_dump($res);
    printf("$escaped_result\n\n");
    printf("%d Row inserted.\n", $mysqli->affected_rows);
}
?>
