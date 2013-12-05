<?php

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

function get_maps() {
    $map_query = array("[[Category:Maps]]",
                       "?x coord",
                       "?z coord",
                       "?image location",
                       "format=json",
                       "searchlabel=JSON output",
                       "prettyprint=yes",
                       "offset=0");
    return query_wiki($map_query);
}

function get_subcategories($category) {
    $subcat_query = array("[[Subcategory of::$category]]",
                          "?icon",
                          "format=json",
                          "searchlabel=JSON output",
                          "prettyprint=yes",
                          "offset=0");
    return query_wiki($subcat_query);
}
?>
