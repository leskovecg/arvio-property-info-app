package com.gasper.realestateinfo.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// Set of Material typography styles to start with
val Typography = Typography(
        titleLarge = TextStyle(
                fontWeight = FontWeight.SemiBold,
                fontSize = 22.sp,
                letterSpacing = 0.sp
        ),
        titleMedium = TextStyle(
                fontWeight = FontWeight.Medium,
                fontSize = 18.sp,
                letterSpacing = 0.1.sp
        ),
        bodyLarge = TextStyle(
                fontSize = 16.sp,
                lineHeight = 24.sp
        ),
        bodySmall = TextStyle(
                fontSize = 13.sp,
                color = TextDark
        ),
        labelMedium = TextStyle(
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold
        )
)
