package com.gasper.realestateinfo.ui.screen

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.navigation.NavController
import com.gasper.realestateinfo.R
import com.gasper.realestateinfo.data.model.Property
import com.gasper.realestateinfo.data.network.fetchUnitDetails
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.StreetViewPanoramaView

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PropertyDetailsScreen(reKey: String, navController: NavController) {
    val context = LocalContext.current
    var property by remember { mutableStateOf<Property?>(null) }

    LaunchedEffect(reKey) {
        fetchUnitDetails(reKey) { property = it }
    }

    property?.let { unit ->
        val lat = unit.gps.lat
        val lng = unit.gps.lng
        val scrollState = rememberScrollState()
        val valueFormatted = unit.unit?.value?.let { String.format("%,.2f", it) } ?: "ni podatka"
        val valueM2Formatted = unit.value_m2?.let { String.format("%,.2f", it) } ?: "ni podatka"
        val sizeFormatted = String.format("%.1f", unit.size)
        val apartmentNo = unit.re_key.split("-").getOrNull(2)

        Column(modifier = Modifier.fillMaxSize()) {
            // Logo & indikator korakov
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
                                    .background(if (i == 3) Color(0xFFE86F5C) else Color.LightGray),
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
                                color = if (i == 3) Color(0xFFE86F5C) else Color.Gray
                            )
                        }
                    }
                }
            }

            // Vsebina
            Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(scrollState)
                    .padding(horizontal = 16.dp)
            ) {
                // Google Street View
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(250.dp)
                        .clip(RoundedCornerShape(16.dp))
                ) {
                    AndroidView(
                        factory = { context ->
                            StreetViewPanoramaView(context).apply {
                                onCreate(null)
                                getStreetViewPanoramaAsync { panorama ->
                                    panorama.setPosition(LatLng(lat, lng))
                                }
                                onResume()
                            }
                        },
                        modifier = Modifier.fillMaxSize()
                    )

                    Column(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        IconButton(
                            onClick = {
                                Toast.makeText(context, "Dodano med priljubljene", Toast.LENGTH_SHORT).show()
                            },
                            modifier = Modifier
                                .size(40.dp)
                                .background(Color.White.copy(alpha = 0.85f), shape = CircleShape)
                        ) {
                            Icon(Icons.Default.Favorite, contentDescription = "Shrani", tint = Color.Red)
                        }

                        IconButton(
                            onClick = {
                                val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                    type = "text/plain"
                                    putExtra(Intent.EXTRA_TEXT, "Poglej nepremičnino na ${unit.address}")
                                }
                                context.startActivity(Intent.createChooser(shareIntent, "Deli preko"))
                            },
                            modifier = Modifier
                                .size(40.dp)
                                .background(Color.White.copy(alpha = 0.85f), shape = CircleShape)
                        ) {
                            Icon(Icons.Default.Share, contentDescription = "Deli", tint = Color.Gray)
                        }
                    }
                }

                Spacer(Modifier.height(16.dp))

                // Nova vrstica: Cena • Velikost • Cena/m2
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = "$valueFormatted EUR  •  ${sizeFormatted}m²  •  $valueM2Formatted EUR/m²",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp
                    )
                }

                Spacer(Modifier.height(12.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.Place, contentDescription = null, tint = Color.Red)
                    Spacer(Modifier.width(4.dp))
                    Text("${unit.address}, Slovenija")
                }

                Spacer(Modifier.height(16.dp))

                // Gumbi: Deli / Poglej na mapi
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Button(
                        onClick = {
                            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                type = "text/plain"
                                putExtra(Intent.EXTRA_TEXT, "Poglej nepremičnino na ${unit.address}")
                            }
                            context.startActivity(Intent.createChooser(shareIntent, "Deli preko"))
                        },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = Color.LightGray)
                    ) {
                        Icon(Icons.Default.Share, contentDescription = null)
                        Spacer(Modifier.width(6.dp))
                        Text("Deli")
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Button(
                        onClick = {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://maps.google.com/?q=$lat,$lng"))
                            context.startActivity(intent)
                        },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF90CAF9))
                    ) {
                        Text("Poglej na mapi", color = Color.White)
                    }
                }

                ElevatedCard(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 16.dp)
                ) {
                    Column(Modifier.padding(16.dp)) {
                        Text("Cenovni podatki", style = MaterialTheme.typography.titleMedium)
                        Text("Cena: $valueFormatted €")
                        Text("Cena/m²: $valueM2Formatted €")
                    }
                }

                unit.unit?.let { details ->
                    ElevatedCard(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 12.dp)
                    ) {
                        Column(Modifier.padding(16.dp)) {
                            Text("Dodatni podatki", style = MaterialTheme.typography.titleMedium)
                            Text("Nadstropje: ${details.story_no}")
                            Text("Tip enote: ${details.unit_type}")
                            Text("Velikost: ${details.net_unit_size} m²")
                            apartmentNo?.let { Text("Stanovanje št.: $it") }
                            Text("Zadnja posodobitev: ${details.last_updated}")
                        }
                    }
                }
            }

            // Gumbi spodaj vedno vidni
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
                        Toast.makeText(context, "Analitika še ni implementirana", Toast.LENGTH_SHORT).show()
                    },
                    modifier = Modifier.weight(1f).height(50.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE86F5C))
                ) {
                    Text("Statistika", color = Color.White)
                }
            }
        }
    } ?: run {
        Text("🔄 Nalagam podrobnosti...")
    }
}
