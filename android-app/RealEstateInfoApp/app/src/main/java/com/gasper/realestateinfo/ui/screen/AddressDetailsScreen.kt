package com.gasper.realestateinfo.ui.screen

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.gasper.realestateinfo.R
import com.gasper.realestateinfo.data.model.Property
import com.gasper.realestateinfo.data.network.fetchUnitDetails
import com.gasper.realestateinfo.globalSelectedAddress
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddressDetailsScreen(navController: NavController) {
    val address = globalSelectedAddress
    if (address == null) {
        Text("❌ Ni izbranega naslova")
        return
    }

    val context = LocalContext.current
    val cameraPositionState = rememberCameraPositionState()
    var selectedUnit by remember { mutableStateOf<Property?>(null) }
    var units by remember { mutableStateOf<List<Property>>(emptyList()) }
    var selectedLatLng by remember { mutableStateOf<LatLng?>(null) }

    LaunchedEffect(address.fullAddress) {
        val latLng = withContext(Dispatchers.IO) {
            geocodeAddress(context, address.fullAddress)
        }
        selectedLatLng = latLng
        latLng?.let {
            cameraPositionState.move(CameraUpdateFactory.newLatLngZoom(it, 14f))
        }
    }

    LaunchedEffect(address.units) {
        if (address.units.isNotEmpty()) {
            val reKeys = address.units
            val collected = mutableListOf<Property>()

            reKeys.map { reKey ->
                async {
                    suspendCancellableCoroutine<Unit> { cont ->
                        fetchUnitDetails(reKey) { property ->
                            property?.let { collected.add(it) }
                            cont.resume(Unit, null)
                        }
                    }
                }
            }.awaitAll()

            units = collected
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        // Logo & Step indikator
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 16.dp, bottom = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Image(
                painter = painterResource(id = R.drawable.arvio_logo),
                contentDescription = "Arvio Logo",
                modifier = Modifier.height(32.dp)
            )
            Spacer(modifier = Modifier.height(8.dp))
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
                                .background(if (i == 2) Color(0xFFE86F5C) else Color.LightGray),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("$i", style = MaterialTheme.typography.bodySmall, color = Color.White)
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
                            color = if (i == 2) Color(0xFFE86F5C) else Color.Gray
                        )
                    }
                }
            }
        }

        Column(
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 8.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Column {
                Text("Naslov", style = MaterialTheme.typography.labelMedium, color = Color.Gray)
                Text(address.fullAddress, style = MaterialTheme.typography.titleSmall)
            }

            LazyColumn(modifier = Modifier.weight(1f)) {
                items(units) { unit ->
                    val label = unit.unit?.unit_type ?: unit.re_type
                    val floor = unit.unit?.story_no ?: "-"
                    val area = unit.unit?.net_unit_size ?: unit.size
                    val reKeyParts = unit.re_key.split("-")

                    ElevatedCard(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp)
                            .clickable { selectedUnit = unit },
                        colors = if (selectedUnit?.re_key == unit.re_key)
                            CardDefaults.elevatedCardColors(containerColor = Color(0xFFFBE9E7))
                        else
                            CardDefaults.elevatedCardColors()
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Text(
                                    text = label,
                                    style = MaterialTheme.typography.titleMedium,
                                    modifier = Modifier.weight(1f)
                                )

                                if (reKeyParts.size == 3) {
                                    reKeyParts.forEach { part ->
                                        Box(
                                            modifier = Modifier
                                                .background(Color(0xFFFFCDD2), shape = RoundedCornerShape(6.dp))
                                                .padding(horizontal = 10.dp, vertical = 4.dp)
                                        ) {
                                            Text(
                                                text = part,
                                                style = MaterialTheme.typography.labelSmall,
                                                color = Color.Black
                                            )
                                        }
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            Row(
                                horizontalArrangement = Arrangement.spacedBy(16.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("Etaza: $floor", style = MaterialTheme.typography.bodySmall)
                                Text("Velikost: $area m²", style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                }
            }

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
                    selectedLatLng?.let {
                        Marker(
                            state = MarkerState(position = it),
                            title = address.fullAddress
                        )
                    }
                }
            }
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Button(
                onClick = { navController.popBackStack() },
                modifier = Modifier.weight(1f).height(50.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color.LightGray)
            ) {
                Text("Nazaj", color = Color.Black)
            }

            Spacer(modifier = Modifier.width(12.dp))

            Button(
                onClick = {
                    selectedUnit?.let {
                        navController.navigate("propertyDetails/${it.re_key}")
                    }
                },
                enabled = selectedUnit != null,
                modifier = Modifier.weight(1f).height(50.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE86F5C))
            ) {
                Text("Nadaljuj", color = Color.White)
            }
        }
    }
}
