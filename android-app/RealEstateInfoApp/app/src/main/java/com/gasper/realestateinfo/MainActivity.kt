package com.gasper.realestateinfo

import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.NavType
import androidx.navigation.compose.*
import com.gasper.realestateinfo.data.model.AddressResult
import com.gasper.realestateinfo.data.network.RetrofitInstance
import com.gasper.realestateinfo.ui.screen.AddressDetailsScreen
import com.gasper.realestateinfo.ui.screen.PropertyDetailsScreen
import com.gasper.realestateinfo.ui.screen.SearchScreen
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response
import com.gasper.realestateinfo.ui.theme.RealEstateInfoAppTheme
import androidx.navigation.navArgument

// Globalna spremenljivka – se prenese med screene
var globalSelectedAddress: AddressResult? = null

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            RealEstateInfoAppTheme {
                val navController = rememberNavController()
                Surface(modifier = Modifier.fillMaxSize()) {
                    NavHost(navController = navController, startDestination = "search") {
                        composable("search") {
                            SearchScreen(navController)
                        }
                        composable("addressDetails") {
                            AddressDetailsScreen(navController)
                        }
                        composable(
                            "propertyDetails/{reKey}",
                            arguments = listOf(navArgument("reKey") {
                                type = NavType.StringType
                            })
                        ) { backStackEntry ->
                            val reKey = backStackEntry.arguments?.getString("reKey") ?: ""
                            PropertyDetailsScreen(reKey = reKey, navController = navController)
                        }
                    }
                }
            }
        }

        Log.d("NAVIGATION", "✅ MainActivity zagnana, inicializiran NavHost")
    }
}

// 🔍 Iskanje naslova (Retrofit klic)
fun searchAddress(query: String, onResult: (List<AddressResult>) -> Unit) {
    val encodedQuery = query.trim().replace("\\s+".toRegex(), "%20")
    val call = RetrofitInstance.api.searchAddress(encodedQuery)

    call.enqueue(object : Callback<List<AddressResult>> {
        override fun onResponse(
            call: Call<List<AddressResult>>,
            response: Response<List<AddressResult>>
        ) {
            if (response.isSuccessful) {
                onResult(response.body() ?: emptyList())
            } else {
                onResult(emptyList())
            }
        }

        override fun onFailure(call: Call<List<AddressResult>>, t: Throwable) {
            onResult(emptyList())
        }
    })
}
