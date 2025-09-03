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

// Global holder for the address the user picked on the search screen.
// It is read by the next screen (AddressDetailsScreen) without having to
// serialize the entire object through the navigation arguments.
var globalSelectedAddress: AddressResult? = null

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            // App theme + material baseline
            RealEstateInfoAppTheme {
                val navController = rememberNavController()

                // Root container for navigation content
                Surface(modifier = Modifier.fillMaxSize()) {
                    // Compose Navigation graph for the app
                    NavHost(navController = navController, startDestination = "search") {
                        // Step 1: search & pick an address
                        composable("search") {
                            SearchScreen(navController)
                        }
                        // Step 2: address details (list of units)
                        composable("addressDetails") {
                            AddressDetailsScreen(navController)
                        }
                        // Step 3: property details for a specific reKey
                        composable(
                            "propertyDetails/{reKey}",
                            arguments = listOf(navArgument("reKey") {
                                type = NavType.StringType
                            })
                        ) { backStackEntry ->
                            // Extract route parameter and pass it to the details screen
                            val reKey = backStackEntry.arguments?.getString("reKey") ?: ""
                            PropertyDetailsScreen(reKey = reKey, navController = navController)
                        }
                    }
                }
            }
        }

    }
}

// Retrofit-backed address search wrapper used by SearchScreen.
// Encodes the query, calls the backend API, and returns results via callback.
// On any error, it returns an empty list to keep the UI resilient.
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
