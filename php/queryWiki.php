<?php

// semantic mediawiki uses hyphens in character codes
function encode_query($raw_query) {
    $encoded_query = $raw_query;
    $encoded_query = str_replace("[", "-5B", $encoded_query);
    $encoded_query = str_replace("]", "-5D", $encoded_query);
    $encoded_query = str_replace("?", "-3F", $encoded_query);
    $encoded_query = str_replace(" ", "-20", $encoded_query);
    $encoded_query = str_replace("=", "-3D", $encoded_query);
    return $encoded_query;
}

// create, send, and recieve http request
function query_wiki($query_array) {
    $options = array("format=json",
                     "searchlabel=JSON output",
                     "prettyprint=yes",
                     "offset=0");
    $ch = curl_init("http://dogtato.net/minecraft/index.php");
    curl_setopt($ch, CURLOPT_POST, TRUE);
    curl_setopt($ch, CURLOPT_HEADER, FALSE);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
    $post_data = "title=Special:Ask/";
    // convert arrays to strings
    $query = implode("/", $query_array);
    $query_options = implode("/", $options);
    // encode certain characters and attach the options
    $post_data .= encode_query($query . "/" . $query_options);
    // echo "{$query_array[0]}<br>";
    curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);
    return curl_exec($ch);
}

function process_response($query_response) {
    $query_items = NULL;

    $query_data = json_decode($query_response);
    if ($query_data != NULL) {
        $query_items = array();
        foreach ($query_data->results as $item_name => $item) {
            $query_items[$item_name] = array();
            foreach ($item->printouts as $property_name => $property_value) {
                if (is_array($property_value)) {
                    $query_items[$item_name][$property_name] = $property_value[0];
                }
                else {
                    $query_items[$item_name][$property_name] = $property_value;
                }
            }
        }
    }
    return $query_items;
}

function get_maps() {
    $map_query = array("[[Category:Maps]]",
                       "?x coord",
                       "?z coord",
                       "?image location");
    $map_response = query_wiki($map_query);
    return process_response($map_response);
}

function get_features($category) {
    $feature_query = array("[[Category:$category]]",
                           "?x coord",
                           "?z coord",
                           "?icon");

    $feature_response = query_wiki($feature_query);
    return process_response($feature_response);
}

function get_subcategories($category) {
    $subcat_query = array("[[Subcategory of::$category]]",
                          "?icon");
    $subcat_response = query_wiki($subcat_query);
    return process_response($subcat_response);
}

function get_children($category, &$known_categories) {
    $subcategories = get_subcategories($category);
    $children = array();
    if ($subcategories != NULL) {
        // add current category to list of known
        array_push($known_categories, $category);
        foreach ($subcategories as $full_sub_name => $sub_cat) {
            // strip off 'Category:'
            $sub_name_parts = explode(":", $full_sub_name);
            $sub_name = $sub_name_parts[1];
            // don't revisit any categories
            if (!in_array($sub_name, $known_categories)) {
                $icon = $sub_cat["Icon"];
                // features in the subcategory
                $features = get_features($sub_name);
                // recurse to traverse all the categories in the tree
                $grandchildren = get_children($sub_name,
                                              $known_categories);
                $children[$sub_name] = array("icon"=>$icon,
                                             "features"=>$features,
                                             "children"=>$grandchildren);
            }
        }
    }
    return $children;
}

function get_data_json() {
    $data = array();

    // store the maps
    $data["maps"] = get_maps();

    // get all the categories and their features
    $categories = array();
    $defaut_icon_query = array("[[:Category:Features]]",
                               "?icon");
    $icon_result = process_response(query_wiki($defaut_icon_query));
    $icon = $icon_result["Category:Features"]["Icon"];
    $features = get_features("Features");
    // get all subcategories and their features
    $known_categories = array();
    $children = get_children("Features", $known_categories);
    // store top level category "features"
    $data["features"] = array("icon"=>$icon,
                              "features"=>$features,
                              "children"=>$children);
    return json_encode($data);
}
?>
