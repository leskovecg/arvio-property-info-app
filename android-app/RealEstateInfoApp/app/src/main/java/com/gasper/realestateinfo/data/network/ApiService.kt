package com.gasper.realestateinfo.data.network

import com.gasper.realestateinfo.data.model.AddressResult
import retrofit2.Call
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.Callback
import retrofit2.Response
import com.gasper.realestateinfo.data.model.Property
import android.util.Log

interface ApiService {

    // search address based on user input
    @GET("api/search_address/{query}")
    fun searchAddress(@Path("query") query: String): Call<List<AddressResult>>

    // get details for a single property (based on unit re_key)
    @GET("api/property/{reKey}")
    fun getUnitDetails(@Path("reKey") reKey: String): Call<Property>
}

fun fetchUnitDetails(reKey: String, onResult: (Property?) -> Unit) {
    val call = RetrofitInstance.api.getUnitDetails(reKey)
    call.enqueue(object : Callback<Property> {
        override fun onResponse(call: Call<Property>, response: Response<Property>) {
            if (response.isSuccessful) {
                onResult(response.body())
            } else {
                onResult(null)
            }
        }
        override fun onFailure(call: Call<Property>, t: Throwable) {
            onResult(null)
        }
    })
}


