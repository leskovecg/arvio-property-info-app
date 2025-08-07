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

    // 1️⃣ Išči naslov glede na uporabnikov input
    @GET("api/search_address/{query}")
    fun searchAddress(@Path("query") query: String): Call<List<AddressResult>>

    // 2️⃣ Pridobi podrobnosti za eno nepremičnino (na podlagi enote re_key)
    @GET("api/property/{reKey}")
    fun getUnitDetails(@Path("reKey") reKey: String): Call<Property>
}

fun fetchUnitDetails(reKey: String, onResult: (Property?) -> Unit) {
    Log.d("FETCH_UNIT", "➡️ Kličem fetchUnitDetails za reKey: $reKey")

    val call = RetrofitInstance.api.getUnitDetails(reKey)
    call.enqueue(object : Callback<Property> {
        override fun onResponse(call: Call<Property>, response: Response<Property>) {
            if (response.isSuccessful) {
                Log.d("FETCH_UNIT", "✅ Uspešen odgovor za $reKey: ${response.body()}")
                onResult(response.body())
            } else {
                Log.w("FETCH_UNIT", "❌ Napaka v odgovoru za $reKey: ${response.code()}")
                onResult(null)
            }
        }

        override fun onFailure(call: Call<Property>, t: Throwable) {
            Log.e("FETCH_UNIT", "💥 Neuspeh pri klicu za $reKey: ${t.message}")
            onResult(null)
        }
    })
}


