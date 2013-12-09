<?php
// get_db connection()
include "/home/dogtaton/db_connect/mcmap.inc";

function get_json_from_sql($category) {
        $mysqli = get_db_connection();
        $result = $mysqli->query("SELECT f1.Data FROM features_json f1 " . 
                                 "LEFT JOIN features_json f2 " .
                                 "ON (f1.Category = f2.Category and " .
                                     "f1.Date < f2.Date) " .
                                 "WHERE (f2.Date is null and " .
                                        "f1.Category = '$category')");
        if($result === FALSE) {
            // for debugging, shouldn't ever happen
            echo $mysqli->error;
            return FALSE;
        }
        else {
            $row = $result->fetch_row();
            return $row[0];
        }
}

function add_json_to_sql($key, $json_data) {
    $mysqli = get_db_connection();
    $escaped_json = $mysqli->real_escape_string($json_data);
    $sql_query = "INSERT INTO features_json (Category, Data) " . 
                 "VALUES('$key', '$escaped_json')";
    $mysqli->query($sql_query);
    // debugging
    // printf("%d Row inserted.\n", $mysqli->affected_rows);
}
?>
