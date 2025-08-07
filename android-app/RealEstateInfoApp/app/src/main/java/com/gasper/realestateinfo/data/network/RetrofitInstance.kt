package com.gasper.realestateinfo.data.network

import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import android.util.Log
import com.gasper.realestateinfo.data.model.AddressResult
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

object RetrofitInstance {

    private const val USE_EMULATOR = false // ⬅️ Preklopi na false za fizično napravo
    private const val EMULATOR_BASE_URL = "http://10.0.2.2:5000/"
    private const val DEVICE_BASE_URL = "http://172.31.40.110:5000/" // tvoj IP

    private val retrofit by lazy {
        Retrofit.Builder()
            .baseUrl(if (USE_EMULATOR) EMULATOR_BASE_URL else DEVICE_BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    val api: ApiService by lazy {
        retrofit.create(ApiService::class.java)
    }
}

fun fetchUnitsForAddress(query: String, onResult: (List<AddressResult>) -> Unit) {
    val encodedQuery = query.trim().replace("\\s+".toRegex(), "%20")
    val call = RetrofitInstance.api.searchAddress(encodedQuery)

    call.enqueue(object : Callback<List<AddressResult>> {
        override fun onResponse(
            call: Call<List<AddressResult>>,
            response: Response<List<AddressResult>>
        ) {
            if (response.isSuccessful) {
                val resultList = response.body() ?: emptyList()
                Log.d("API_RESULT", "Uspešno prejeli ${resultList.size} rezultatov")
                onResult(resultList)
            } else {
                Log.e("API", "Napaka pri iskanju: ${response.code()}")
                onResult(emptyList())
            }
        }

        override fun onFailure(call: Call<List<AddressResult>>, t: Throwable) {
            Log.e("API", "Napaka pri povezavi: ${t.message}")
            onResult(emptyList())
        }
    })
}

