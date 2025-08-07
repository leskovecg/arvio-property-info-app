package com.gasper.realestateinfo.data.model
import com.google.gson.annotations.SerializedName


data class AddressResult(
    @SerializedName("city") val city: String,
    @SerializedName("full_address") val fullAddress: String,
    @SerializedName("id") val id: Long,
    @SerializedName("post_office") val postOffice: String,
    @SerializedName("postal_number") val postalNumber: Int,
    @SerializedName("street") val street: String,
    @SerializedName("street_number") val streetNumber: String,
    @SerializedName("units") val units: List<String>
)