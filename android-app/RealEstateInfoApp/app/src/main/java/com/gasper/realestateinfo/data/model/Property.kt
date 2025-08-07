package com.gasper.realestateinfo.data.model

data class Property(
    val re_key: String,
    val address: String,
    val re_type: String,
    val size: Double,
    val value_m2: Double?,
    val gps: Gps,
    val unit: UnitDetails?
)

data class Gps(
    val lat: Double,
    val lng: Double
)

data class UnitDetails(
    val unit_type: String,
    val net_unit_size: Double?,
    val rooms: List<String>?,
    val has_elevator: Boolean?,
    val story_no: Int?,
    val valuation_zone: Int?,
    val last_updated: String?,
    val value: Double?
)
