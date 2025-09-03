package com.gasper.realestateinfo.ui.screen

import android.content.Context
import android.location.Geocoder
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.gasper.realestateinfo.R
import com.gasper.realestateinfo.data.model.AddressResult
import com.gasper.realestateinfo.globalSelectedAddress
import com.gasper.realestateinfo.searchAddress
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.*

/**
 * Helper: geocode a free-form address string into a LatLng using the
 * platform Geocoder. Returns null if the address cannot be resolved.
 */
fun geocodeAddress(context: Context, address: String): LatLng? {
    return try {
        val geocoder = Geocoder(context, Locale.getDefault())
        val results = geocoder.getFromLocationName(address, 1)
        if (!results.isNullOrEmpty()) {
            val loc = results[0]
            LatLng(loc.latitude, loc.longitude)
        } else null
    } catch (e: Exception) {
        null
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchScreen(navController: NavController) {
    // UI state
    var query by remember { mutableStateOf("") }                           // current search text
    var results by remember { mutableStateOf<List<AddressResult>>(emptyList()) } // suggestions list
    var selected by remember { mutableStateOf<AddressResult?>(null) }      // chosen suggestion
    var selectedLatLng by remember { mutableStateOf<LatLng?>(null) }       // geocoded position

    // Map state
    val cameraPositionState = rememberCameraPositionState()

    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val currentStep = 1 // stepper: this screen is step 1

    Box(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                // allow the whole content to scroll and keep room for the bottom button
                .verticalScroll(rememberScrollState())
                .padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 72.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Brand logo
            Image(
                painter = painterResource(id = R.drawable.arvio_logo),
                contentDescription = "Arvio Logo",
                modifier = Modifier
                    .height(32.dp)
                    .align(Alignment.CenterHorizontally)
            )

            // Stepper header (1..3), highlights current step
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                for (i in 1..3) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Box(
                            modifier = Modifier
                                .size(24.dp)
                                .clip(CircleShape)
                                .background(if (i == currentStep) Color(0xFFE86F5C) else Color.LightGray),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "$i",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color.White
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = when (i) {
                                1 -> "Začetek"
                                2 -> "Naslov"
                                3 -> "Podrobnosti"
                                else -> ""
                            },
                            style = MaterialTheme.typography.bodySmall,
                            color = if (i == currentStep) Color(0xFFE86F5C) else Color.Gray
                        )
                    }
                }
            }

            // Title + example hint
            Text(
                "Vnesite naslov nepremičnine",
                style = MaterialTheme.typography.titleLarge,
                modifier = Modifier.align(Alignment.CenterHorizontally)
            )
            Text(
                "Primer: Dunajska cesta 51, 1000 Ljubljana",
                style = MaterialTheme.typography.bodySmall.copy(fontStyle = FontStyle.Italic),
                modifier = Modifier.align(Alignment.CenterHorizontally)
            )

            // Search input; triggers backend address suggestions after 3+ chars
            OutlinedTextField(
                value = query,
                onValueChange = {
                    query = it
                    if (it.length >= 3) {
                        // Calls your backend proxy (searchAddress) and updates the suggestions list
                        searchAddress(it) { res -> results = res }
                    }
                },
                placeholder = { Text("Naslov nepremičnine") },
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp)),
                shape = RoundedCornerShape(12.dp),
                singleLine = true
            )

            // Suggestions dropdown (as a short list). Tap to pick one.
            LazyColumn(modifier = Modifier.heightIn(max = 150.dp)) {
                items(results) { addr ->
                    ElevatedCard(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp)
                            .clickable {
                                // Save selection both locally and globally (for next screen)
                                selected = addr
                                globalSelectedAddress = addr

                                // Geocode selected address and remember the LatLng for the map
                                coroutineScope.launch {
                                    val latLng = withContext(Dispatchers.IO) {
                                        geocodeAddress(context, addr.fullAddress)
                                    }
                                    selectedLatLng = latLng
                                }
                            }
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(addr.fullAddress, style = MaterialTheme.typography.bodyLarge)
                        }
                    }
                }
            }

            // Map preview showing a marker at the selected address
            selected?.let {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(220.dp),
                    shape = RoundedCornerShape(12.dp),
                    elevation = CardDefaults.elevatedCardElevation()
                ) {
                    GoogleMap(
                        modifier = Modifier.fillMaxSize(),
                        cameraPositionState = cameraPositionState
                    ) {
                        Marker(
                            state = MarkerState(position = selectedLatLng ?: LatLng(46.05, 14.5)),
                            title = it.fullAddress
                        )
                    }
                }
            }
        }

        // When geocoding completes, move the camera to the result
        LaunchedEffect(selectedLatLng) {
            selectedLatLng?.let {
                cameraPositionState.position = CameraPosition.fromLatLngZoom(it, 14f)
            }
        }

        // Sticky bottom primary action: goes to the list of units for the selected address
        Button(
            onClick = {
                if (selected != null) {
                    navController.navigate("addressDetails")
                }
            },
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(16.dp)
                .fillMaxWidth()
                .height(50.dp),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE86F5C))
        ) {
            Text("Nadaljuj", color = Color.White)
        }
    }
}
